/**
 * #199: a person's CV. It has a past drawn from the career's seed, using this world's companies, and it grows: their
 * years, their moves, their time at our table ("ex-…"), their grade and pay. A long career never runs out of people.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { industryCareerOf } from '../services/industry/industryCareer';
import {
    INDUSTRY_SEAT_ROLES,
    getIndustryPeople,
    getIndustryPeopleNow,
    getIndustryPerson,
    industryCareerCompanies,
    industryPersonNow,
    industryPersonWorking,
    moveIndustryPerson,
    processIndustryPeopleWeek,
} from '../services/industry/industryPeople';
import { dismissStreamingTeamExecutive, getStreamingTeamCandidates, getStreamingTeamView, hireStreamingTeamCandidate } from '../services/team/streamingTeam';

const started = Date.now();
const pass = (label: string) => console.log(`✓ ${label}`);
const fresh = (id: string, name = 'Career Audit'): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name, age: 25, currentWeek: 1 });
    return { ...player, money: 5e9, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const later = (player: Player, weeks: number): Player => {
    const total = player.currentWeek - 1 + weeks;
    return { ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1, energy: { current: 100, max: 100 } };
};

const run = async () => {
    const blank = fresh('careers');
    const executives = getIndustryPeople(blank).filter(person => person.kind === 'EXECUTIVE' && person.role !== 'CEO');
    const companies = new Set(industryCareerCompanies());

    /* ── the past ── */
    executives.forEach(person => {
        const career = industryCareerOf(blank, person);
        const expected = person.yearsExperience <= 6 ? 2 : person.yearsExperience <= 13 ? 3 : 4;
        assert.ok(career.jobs.length >= 2 && career.jobs.length <= expected, `${person.name} (${person.yearsExperience} yrs): ${career.jobs.length} jobs`);
        career.jobs.forEach(job => {
            assert.ok(job.company && job.title && job.span && job.result, `${person.name}: a whole job`);
            assert.ok(!/\{[a-z]\}/.test(job.result), `${person.name}: no blanks in "${job.result}"`);
        });
        assert.equal(new Set(career.jobs.map(job => job.company)).size, career.jobs.length, `${person.name}: no company twice`);
        career.jobs.slice(person.start.kind === 'FREE' ? 1 : 0, career.jobs.length).forEach(job => {
            if (job.company !== person.formerCompany) assert.ok(companies.has(job.company), `${person.name}: ${job.company} is in this world`);
        });
        if (person.start.kind === 'RIVAL' || person.start.kind === 'STUDIO') {
            assert.ok(career.jobs[0].now && career.jobs[0].company === person.start.name, `${person.name}: the job they have now comes first`);
        } else {
            assert.ok(!career.jobs[0].now, `${person.name}: between roles, nothing is now`);
        }
    });
    const again = executives.slice(0, 20).map(person => JSON.stringify(industryCareerOf(blank, person)));
    assert.deepEqual(executives.slice(0, 20).map(person => JSON.stringify(industryCareerOf(fresh('careers'), person))), again, 'the same CV every load');
    const sample = executives.find(person => person.start.kind === 'RIVAL' && person.yearsExperience > 13)!;
    const sampleCareer = industryCareerOf(blank, sample);
    pass(`every CV has 2–4 jobs in this world's companies; ${sample.name}: ${sampleCareer.jobs.map(job => `${job.company} ${job.span}`).join(', ')}`);

    /* ── it grows ── */
    let world = processIndustryPeopleWeek(blank);
    const began = getAbsoluteWeek(world.age, world.currentWeek);
    assert.equal(world.world?.industryPeople?.firstWeek, began, 'the industry knows when it began');
    const person = executives.find(item => item.grade === 'RISING' && (item.growthPerYear || 0) > 1 && item.start.kind === 'RIVAL')!;
    const before = industryCareerOf(world, person);
    const fiveLater = later(world, 52 * 5);
    const grown = industryPersonNow(fiveLater, person);
    const careerLater = industryCareerOf(fiveLater, person);
    assert.equal(grown.yearsExperience, person.yearsExperience + 5, 'years grow');
    assert.equal(careerLater.years, person.yearsExperience + 5);
    assert.ok(grown.skill > person.skill, 'skill grows');
    assert.ok(grown.weeklyCompensation > person.weeklyCompensation, 'so does their pay');
    assert.notEqual(careerLater.jobs[0].span, before.jobs[0].span, 'the current job gets longer');
    const tenLater = later(world, 52 * 10);
    const grade = industryPersonNow(tenLater, person);
    assert.notEqual(grade.grade, person.grade, 'a rising name becomes more');
    pass(`${person.name} after 10 years: skill ${person.skill} → ${grade.skill}, ${person.grade} → ${grade.grade}, ${Math.round(person.weeklyCompensation / 1000)}K → ${Math.round(grade.weeklyCompensation / 1000)}K a week`);

    /* ── a move goes on the CV ── */
    const moved = moveIndustryPerson(later(world, 26), person.id, { kind: 'STUDIO', id: 'x', name: 'A New Studio' });
    const movedLater = later(moved, 52);
    const movedCareer = industryCareerOf(movedLater, person);
    assert.equal(movedCareer.jobs[0].company, 'A New Studio', 'the new job comes first');
    assert.ok(movedCareer.jobs[0].now, 'and is the job they have now');
    assert.equal(movedCareer.jobs[0].span, '1 yr');
    assert.equal(movedCareer.jobs[1].company, person.start.name);
    assert.ok(!movedCareer.jobs[1].now, 'the old one has ended');
    pass(`a move: ${movedCareer.jobs.slice(0, 2).map(job => `${job.company} ${job.span}`).join(', ')}`);

    /* ── our own table ── */
    const ours = processIndustryPeopleWeek(later(await buildStreamingFullPlatformQa(fresh('careers-ours'), { processWeek: processGameWeek, persistWeek: async next => next }), 1));
    const offered = getStreamingTeamCandidates(ours, 'TRUST')[0];
    assert.ok(offered.career.jobs.length >= 2, 'a candidate shows their career');
    const hired = hireStreamingTeamCandidate(ours, 'TRUST', offered.id);
    assert.ok(hired.changed, hired.message);
    const seat = getStreamingTeamView(hired.player).seats.find(item => item.seatId === 'TRUST')!;
    assert.equal(seat.executive?.career?.jobs[0].company, normalizeOwnedStreamingPlatformState(hired.player.ownedStreamingPlatform, hired.player.id).identity!.name, 'our table comes first');
    assert.ok(seat.executive?.career?.jobs[0].now && seat.executive?.career?.jobs[0].ours, 'and they are there now');
    assert.equal(seat.executive?.career?.alumOf, null, 'not an ex yet');
    assert.equal(seat.executive!.career!.jobs.filter(job => job.now).length, 1, 'one job now');
    const year = later(processIndustryPeopleWeek(hired.player), 52);
    const gone = dismissStreamingTeamExecutive(year, 'TRUST').player;
    const alum = industryCareerOf(gone, getIndustryPerson(gone, offered.id)!);
    assert.equal(alum.alumOf, `ex-${normalizeOwnedStreamingPlatformState(gone.ownedStreamingPlatform, gone.id).identity!.name}`, 'someone who left shows it');
    assert.equal(alum.jobs[0].span, '1 yr');
    assert.ok(!alum.jobs[0].now, 'and is no longer there');
    pass(`our table: "${alum.jobs[0].company}, ${alum.jobs[0].span}, ${alum.jobs[0].result}", then ${alum.alumOf}`);

    /* ── a long career ── */
    let longest = 0;
    INDUSTRY_SEAT_ROLES.forEach(role => {
        [0, 10, 20, 30, 40, 50, 60, 70, 85].forEach(years => {
            const then = later(world, 52 * years);
            const working = getIndustryPeopleNow(then).filter(item => item.kind === 'EXECUTIVE' && item.role === role && industryPersonWorking(then, item));
            assert.ok(working.length >= 12, `${role} after ${years} years: ${working.length} still working`);
            working.forEach(item => {
                const now = industryPersonNow(then, item);
                assert.ok(now.yearsExperience < 52, `${item.name} has worked ${now.yearsExperience} years`);
                longest = Math.max(longest, now.yearsExperience);
            });
        });
    });
    assert.equal(getIndustryPeople(blank).length, getIndustryPeople(fresh('careers')).length, 'the first draw is unchanged');
    const firstClass = getIndustryPerson(blank, 'exec-cto-c1-0')!;
    assert.ok(firstClass && firstClass.debutYears === 10, 'the next class exists');
    assert.ok(!getIndustryPeopleNow(world).some(item => item.id === firstClass.id), 'and is not on the market until its year');
    assert.ok(getIndustryPeopleNow(later(world, 52 * 11)).some(item => item.id === firstClass.id), 'then it is');
    pass(`85 years on, every job still has 12+ people working, nobody over ${longest} years in`);

    /* ── the weekly upkeep keeps saves small ── */
    let weeks = world;
    for (let week = 0; week < 156; week += 1) weeks = processIndustryPeopleWeek(later(weeks, 1));
    const joins = weeks.world?.industryPeople?.joins || {};
    assert.ok(Object.keys(joins).length > 10, 'moves are noted');
    assert.ok(Object.values(joins).every(list => list.length <= 3), 'at most 3 a person');
    const size = JSON.stringify(joins).length;
    assert.ok(size < 30_000, `the notes stay small: ${size} bytes`);
    pass(`three years of the market: ${Object.keys(joins).length} people moved, ${(size / 1024).toFixed(1)} KB of notes`);

    console.log(`Team careers audit passed in ${Math.round((Date.now() - started) / 1000)} s.`);
};

run().catch(error => { console.error(error); process.exit(1); });
