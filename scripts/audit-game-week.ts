/**
 * #236 (plan §25.4 Q6): one week function. Absolute weeks are zero-based, so a date maps back to the week and year it came from; no
 * screen shows a raw absolute week, and nothing uses the old off-by-one.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getAbsoluteWeek } from "../services/legacyLogic";
import { gameWeekLabel, gameWeekShort, gameWeekText, gameYearWeekShort, gameYearWeekText, weekOfYear } from "../services/gameWeek";

for (const age of [1, 15, 37, 80]) {
    for (let week = 1; week <= 52; week += 1) assert.equal(weekOfYear(getAbsoluteWeek(age, week)), week, "week " + week + " at age " + age);
}
console.log("✓ a date maps back to its own week of the year, every week of the year");
const now = getAbsoluteWeek(37, 20);
assert.equal(gameWeekLabel(getAbsoluteWeek(37, 40), now), "Week 40");
assert.equal(gameWeekLabel(getAbsoluteWeek(38, 3), now), "Week 3 next year");
assert.equal(gameWeekLabel(getAbsoluteWeek(40, 3), now), "Week 3 in 3 years");
assert.equal(gameWeekLabel(getAbsoluteWeek(36, 3), now), "Week 3 last year");
assert.equal(gameWeekText(getAbsoluteWeek(38, 3), now), "week 3 next year");
assert.equal(gameWeekText(getAbsoluteWeek(38, 3)), "week 3");
assert.equal(gameWeekShort(getAbsoluteWeek(38, 3)), "W3");
assert.equal(gameYearWeekShort(getAbsoluteWeek(37, 40)), "37YR 40WK");
assert.equal(gameYearWeekShort(getAbsoluteWeek(36, 3)), "36YR 3WK");
assert.equal(gameYearWeekShort(getAbsoluteWeek(1, 1)), "1YR 1WK");
assert.equal(gameYearWeekText(getAbsoluteWeek(36, 52)), "year 36, week 52");
console.log("✓ the words: this year, next year, later, earlier");

const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) ? [path] : [];
});
const raw = /\b(Week|week) (\$\{|\{)[^}]*(startsAt|expiresAt|readyAt|opensAt|completedAt|openedAt|plannedAvailability|dueAt|premiereAt|recoveryReadyAt|detectedAt)[A-Za-z]*AbsoluteWeek[^}]*\}/;
const offByOne = /\(\([A-Za-z.]*AbsoluteWeek - 1\) % 52\) \+ 1/;
/* 1.0.26 beta (Zeesh's screenshot): the Audience chart read "WK 748 · WK 755 · WK 763", so a "WK" chip over an
   absolute week (a chart point's .week, an ...AtWeek, a campaign's resultsWeek, an ...AbsoluteWeek) counts as raw too */
const rawWk = /\bWK (\$\{|\{)[^}]*(\.week|[aA]bsoluteWeek|opensWeek|At(Absolute)?Week|resultsWeek)\b[^}]*\}/;
const bad: string[] = [];
for (const dir of ["components", "views", "services", "content-market-exact"]) {
    for (const path of files(dir)) {
        readFileSync(path, "utf8").split("\n").forEach((line, index) => {
            if (raw.test(line) || rawWk.test(line) || offByOne.test(line)) bad.push(path + ":" + (index + 1));
        });
    }
}
assert.deepEqual(bad, [], "a raw or off-by-one week on a screen");
console.log("✓ no raw absolute week reaches a screen, and no off-by-one is left");
console.log("game-week audit passed");
