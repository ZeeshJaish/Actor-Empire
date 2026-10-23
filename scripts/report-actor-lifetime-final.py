"""Read-only evidence report for earned fresh-career continuations.

Run only after the lifetime workers have checkpointed. No player/save edits.
"""
import csv
import gzip
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/reports/2026-10-23-fresh-to-legend'
EVIDENCE = OUT / 'evidence'
EVIDENCE.mkdir(parents=True, exist_ok=True)


def read(path):
    return json.loads(Path(path).read_text())


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def summarize(result):
    points = result['curve']
    last = points[-1]

    def first(predicate):
        return next((p['weeks'] for p in points if predicate(p)), None)

    return {
        'strategy': result['strategy'], 'status': result['status'],
        'weeks': result['weeks'], 'years': round(result['weeks'] / 52, 2),
        'legendWeek': result.get('legendWeek'),
        'weeksAfterFirstLegend': (result['weeks'] - result['legendWeek']) if result.get('legendWeek') is not None else None,
        'firstPremiere': first(lambda p: p['releasedCredits'] > 0),
        'craft50': first(lambda p: p['craft'] >= 50),
        'craft80': first(lambda p: p['craft'] >= 80),
        'anyActingSkill95': first(lambda p: max(v for k, v in p['skills'].items() if k != 'writing') >= 95),
        'anyActingSkill100': first(lambda p: max(v for k, v in p['skills'].items() if k != 'writing') >= 100),
        'allActingSkills95': first(lambda p: min(v for k, v in p['skills'].items() if k != 'writing') >= 95),
        'allActingSkills100': first(lambda p: min(v for k, v in p['skills'].items() if k != 'writing') >= 100),
        'fame50': first(lambda p: p['fame'] >= 50),
        'fame94': first(lambda p: p['fame'] >= 94),
        'cash': result['cash'], 'debt': last.get('debt', 0),
        'netCashAfterDebt': last.get('netCashAfterDebt'),
        'totalBorrowed': last.get('totalBorrowed', 0),
        'craft': last['craft'], 'skills': last['skills'], 'fame': result['fame'],
        'reputation': result['reputation'], 'experience': result['experience'],
        'releasedCredits': last['releasedCredits'], 'archivedCredits': len(result['credits']),
        'recentCareerEvidence': last['careerEvidence'],
        'grossSignedActingSalaryReceived': last.get('cumulativeSalary'),
        'agentCommissionsDebited': last.get('cumulativeCommission'),
        'verifiedReloads': result['reloads'], 'verifiedSaves': result['saves'],
        'cinemaSettlementReplayRejections': result['replays'],
        'simulatedPurchaseActions': [a for a in result['actions'] if a['type'].startswith('simulated-purchase:')],
        'minimumCash': min(p['cash'] for p in points),
        'negativeCashWeeks': sum(p['cash'] < 0 for p in points),
        'firstCashMillion': first(lambda p: p['cash'] >= 1_000_000),
        'firstCashTenMillion': first(lambda p: p['cash'] >= 10_000_000),
        'largestWeeklyCashIncreases': sorted([
            {'week': b['weeks'], 'increase': b['cash'] - a['cash']}
            for a, b in zip(points, points[1:])
        ], key=lambda row: row['increase'], reverse=True)[:5],
        'failure': result.get('failure'),
    }


results = {}
summaries = {}
lineages = {}
source_checks = {}
players = {}
type_proof = read('/tmp/ae-lifetime-type-only-proof.json')
assert type_proof['runtimeEquivalent'] and digest(ROOT / type_proof['path']) == type_proof['currentSourceSha256']
type_only = {type_proof['path']}
fix_sources = {'services/saveMigration.ts', 'services/roleLogic.ts',
               'services/boxOffice/boxOfficeAwareness.ts', 'services/boxOffice/boxOfficeInputs.ts',
               'services/boxOffice/boxOfficeExposureAdapters.ts', 'services/boxOffice/boxOfficeWeek.ts'}
late_legacy_guard = {'services/boxOffice/boxOfficeOfferedLaunch.ts'}
for route in ['free', 'boosted']:
    base = Path(f'/tmp/ae-lifetime-repaired-{route}')
    result_file = base / route / 'career-0-results.json'
    result = read(result_file)
    results[route] = result
    summaries[route] = summarize(result)
    prefix = json.loads(gzip.decompress((base / 'prefix.json.gz').read_bytes()))
    checkpoint = json.loads(gzip.decompress((base / route / 'career-0.json.gz').read_bytes()))
    players[route] = checkpoint['player']
    lineage = read(base / 'lineage.json')
    assert digest(base / 'prefix.json.gz') == lineage['sourceCheckpointSha256']
    # Use the same JSON number serialization as the original JavaScript handoff.
    player_hash = subprocess.check_output([
        'node', '--input-type=module', '--eval',
        "import{readFileSync}from'node:fs';import{gunzipSync}from'node:zlib';"
        "import{createHash}from'node:crypto';"
        "const p=JSON.parse(gunzipSync(readFileSync(process.argv[1]))).player;"
        "process.stdout.write(createHash('sha256').update(JSON.stringify(p)).digest('hex'));",
        str(base / 'prefix.json.gz'),
    ], text=True)
    assert player_hash == lineage['playerHash']
    lineages[route] = {
        **lineage, 'finalCheckpointSha256': digest(base / route / 'career-0.json.gz'),
        'finalCheckpointWeek': checkpoint['weeks'],
        'finalExecutableWeeks': checkpoint['weeks'] - prefix['weeks'],
        'finalExecutableReloads': checkpoint['reloads'] - prefix['reloads'],
        'unchangedPrefixVerified': True,
    }
    meta = read(base / 'executable.json')
    source_checks[route] = {
        'pinnedSources': len(meta['sourceHashes']),
        'changedSources': [f for f, sha in meta['sourceHashes'].items() if digest(ROOT / f) != sha],
        'executableHashMatches': digest(base / 'worker.mjs') == meta['sha256'],
    }
    source_checks[route]['runtimeChangedSources'] = [p for p in source_checks[route]['changedSources'] if p not in type_only]
    source_checks[route]['typeOnlyConcurrentChanges'] = [p for p in source_checks[route]['changedSources'] if p in type_only]
    source_checks[route]['lateLegacyGuardChanges'] = [p for p in source_checks[route]['runtimeChangedSources'] if p in late_legacy_guard]
    source_checks[route]['unrelatedConcurrentRuntimeChanges'] = [p for p in source_checks[route]['runtimeChangedSources'] if p not in late_legacy_guard]
    # Do not overwrite or silently bless concurrent economy work. Frozen runs
    # remain valid for their recorded snapshot; our own repairs must stay exact.
    assert not fix_sources.intersection(source_checks[route]['runtimeChangedSources'])
    assert source_checks[route]['executableHashMatches']
    shutil.copyfile(base / 'executable.json', EVIDENCE / f'{route}-executable.json')
    shutil.copyfile(Path(f'/tmp/ae-lifetime-final-{route}/executable.json'), EVIDENCE / f'pre-exposure-{route}-executable.json')
    with gzip.open(EVIDENCE / f'{route}-result.json.gz', 'wt') as f:
        json.dump(result, f, separators=(',', ':'))

pressure = {}
for scenario in ['focused', 'neglect', 'overbooked']:
    root = Path(f'/tmp/ae-lifetime-pressure-free-{scenario}')
    r = read(root / 'free/career-0-results.json')
    assert r['status'] == 'HORIZON_COMPLETE' and r['weeks'] == 372
    pressure[scenario] = summarize(r)


def delivered_performances(player):
    delivered = {}
    for p in player.get('pastProjects', []) + player.get('activeReleases', []):
        if p.get('type') == 'ACTING_GIG' or p.get('castList') or p.get('projectDetails', {}).get('castList'):
            value = p.get('playerRolePerformance', p.get('productionPerformance'))
            if value is not None:
                delivered[p['id']] = {'id': p['id'], 'name': p['name'], 'performance': value}
    for p in player.get('commitments', []):
        if p.get('type') == 'ACTING_GIG' and p.get('careerPerformanceFinalized'):
            delivered[p['id']] = {'id': p['id'], 'name': p['name'], 'performance': p['productionPerformance']}
    return delivered


mastery = {}
for scenario in ['focused', 'neglect', 'overbooked']:
    extended = Path(f'/tmp/ae-lifetime-maxed-long-boosted-{scenario}')
    root = extended if extended.exists() else Path(f'/tmp/ae-lifetime-maxed-slots-boosted-{scenario}')
    path = root / 'boosted/career-0-results.json'
    if not path.exists():
        continue
    r = read(path)
    if 'strategy' not in r:
        mastery[scenario] = {'status': 'AWAITING_FIRST_BATCH'}
        continue
    lineage = read(root / 'lineage.json')
    assert digest(root / 'prefix.json.gz') == lineage['sourceCheckpointSha256']
    prefix = json.loads(gzip.decompress((root / 'prefix.json.gz').read_bytes()))
    assert all(v == 100 for k, v in prefix['player']['stats']['skills'].items() if k != 'writing')
    latest = json.loads(gzip.decompress((root / 'boosted/career-0.json.gz').read_bytes()))
    before = delivered_performances(prefix['player'])
    after = delivered_performances(latest['player'])
    for project_id, row in before.items():
        if project_id in after:
            assert row['performance'] == after[project_id]['performance'], project_id
    initial_projects = {p['id']: p for p in prefix['player']['commitments']}
    new_performances = []
    for project_id, row in after.items():
        if project_id in before:
            continue
        initial = initial_projects.get(project_id, {})
        new_performances.append(row | {'initialPhase': initial.get('projectPhase', 'NOT_YET_SIGNED'),
                                      'initialPreparation': initial.get('productionPerformance'),
                                      'fullyPreparedAtFork': initial.get('projectPhase') == 'PRODUCTION' and initial.get('productionPerformance', 0) >= 100})
    not_prepared = [p for p in new_performances if not p['fullyPreparedAtFork']]
    practice = [a for a in r['actions'] if a['week'] >= prefix['weeks'] and a['type'] == 'project-rehearsal']
    practice_by_week = {}
    for action in practice:
        practice_by_week.setdefault(action['week'], set()).add(action['projectId'])
    meta = read(root / 'executable.json')
    drifted = [p for p, sha in meta['sourceHashes'].items() if digest(ROOT / p) != sha]
    assert not fix_sources.intersection(p for p in drifted if p not in type_only)
    mastery[scenario] = summarize(r) | {
        'handoffWeek': prefix['weeks'], 'comparisonWeeks': r['weeks'] - prefix['weeks'],
        'allActingSkillsAtStart': {k: v for k, v in prefix['player']['stats']['skills'].items() if k != 'writing'},
        'minimumActingSkillAtStart': min(v for k, v in prefix['player']['stats']['skills'].items() if k != 'writing'),
        'newlyDeliveredPerformances': new_performances,
        'meanNewlyDeliveredPerformance': sum(p['performance'] for p in new_performances) / len(new_performances) if new_performances else None,
        'meanNotFullyPreparedAtFork': sum(p['performance'] for p in not_prepared) / len(not_prepared) if not_prepared else None,
        'rehearsalActionsDuringWindow': len(practice),
        'maxDistinctProjectsRehearsedInOneWeek': max(map(len, practice_by_week.values()), default=0),
        'newPersonalProjectIDsObserved': [row[0] for row in r['signed'] if row[0] not in dict(prefix['signed'])],
        'existingDeliveredPerformanceStable': True, 'sourceDrift': drifted,
        'runtimeSourceDrift': [p for p in drifted if p not in type_only],
        'lineage': lineage,
    }
    with gzip.open(EVIDENCE / f'mastery-{scenario}-result.json.gz', 'wt') as f:
        json.dump(r, f, separators=(',', ':'))
    if (root / 'resume-prefix.json.gz').exists():
        assert digest(root / 'resume-prefix.json.gz') == lineage['resumeCheckpointSha256']

near_mastery_baseline = {}
for scenario in ['focused', 'neglect', 'overbooked']:
    root = Path(f'/tmp/ae-lifetime-mastery-boosted-{scenario}')
    r = read(root / 'boosted/career-0-results.json')
    near_mastery_baseline[scenario] = summarize(r) | {'handoffWeek': 681, 'comparisonWeeks': r['weeks'] - 681, 'sourceVersion': 'Before continuation exposure repair; retained baseline, not final-source validation'}
    with gzip.open(EVIDENCE / f'near-mastery-baseline-{scenario}.json.gz', 'wt') as f:
        json.dump(r, f, separators=(',', ':'))

matched_roles = []
if all('newlyDeliveredPerformances' in mastery.get(mode, {}) for mode in ['focused', 'neglect', 'overbooked']):
    maps = {mode: {p['id']: p for p in row['newlyDeliveredPerformances']} for mode, row in mastery.items()}
    common = set(maps['focused']).intersection(maps['neglect'], maps['overbooked'])
    for project_id in sorted(common):
        matched_roles.append({'id': project_id, 'name': maps['focused'][project_id]['name'],
                              **{mode: project_map[project_id]['performance'] for mode, project_map in maps.items()}})

financial_witnesses = {}
for route, player in players.items():
    projects = player.get('pastProjects', []) + player.get('activeReleases', [])
    by_id = {p['id']: p for p in projects}
    titles = player['world']['cinemaMarket']['titles']
    payouts = []
    for title in titles.values():
        if title['titleId'] not in by_id or not title.get('actorPaidCents'):
            continue
        p = by_id[title['titleId']]
        payouts.append({
            'projectId': title['titleId'], 'name': p['name'],
            'personalPerformance': p.get('playerRolePerformance', p.get('productionPerformance')),
            'projectQuality': p.get('projectQuality', p.get('projectDetails', {}).get('hiddenStats', {}).get('qualityScore')),
            'gross': title['grossCents'] / 100,
            'canonicalActorPaid': title['actorPaidCents'] / 100,
            'closed': title.get('closed'),
        })
    contracts = player['world']['streamingRightsContracts']
    contracts = contracts.values() if isinstance(contracts, dict) else contracts
    by_contract = {c['id']: c for c in contracts}
    snapshots = []
    for p in player.get('pastProjects', []):
        contract = by_contract.get(p.get('streamingContractId'), {})
        if p.get('outcomeTier') == 'MAJOR_FAILURE' and (p.get('imdbRating') or 0) >= 7.4 and p.get('totalViews', 0) > 0 and not p.get('gross') and not p.get('streamingRevenue'):
            snapshots.append({k: p.get(k) for k in ['id', 'name', 'studioId', 'streamingPlatform', 'imdbRating', 'playerRolePerformance', 'totalViews', 'gross', 'streamingRevenue', 'outcomeTier', 'streamingContractId']} | {
                'contractAccessSource': contract.get('accessGrant', {}).get('source'),
                'contractGuaranteeStatus': contract.get('settlement', {}).get('guarantee'),
                'minimumGuarantee': contract.get('minimumGuarantee'),
                'productionFunding': contract.get('productionFunding'),
                'licensorRevenueShare': contract.get('licensorRevenueShare'),
                'followUp': 'Reconcile placeholder/disclosed receipts before treating this financial label as fair actor difficulty; no receipt or reputation rewrite in this task',
            })
    financial_witnesses[route] = {
        'largestCanonicalTheatricalActorPayouts': sorted(payouts, key=lambda x: x['canonicalActorPaid'], reverse=True)[:5],
        'highRatedZeroReceiptStreamingLabels': snapshots,
        'salaryIsNotTotalCareerIncome': True,
    }

controls = []
for root_name, route in [
    ('v3-free', 'free'), ('v3-boosted', 'boosted'),
    ('care-free', 'free'), ('care-boosted', 'boosted'),
    ('managed-free', 'free'), ('managed-boosted', 'boosted'),
    ('ambitious-free', 'free'), ('ambitious-boosted', 'boosted'),
    ('budget-free', 'free'), ('budget-boosted', 'boosted'),
    ('complete-free', 'free'), ('complete-boosted', 'boosted'),
    ('finance-boosted', 'boosted'),
    ('final-free', 'free'), ('final-boosted', 'boosted'),
    ('exposure-red', 'boosted'), ('exposure-recovery', 'boosted'),
]:
    path = Path(f'/tmp/ae-lifetime-{root_name}/{route}/career-0-results.json')
    if path.exists():
        r = read(path)
        controls.append({'path': str(path), 'status': r['status'], 'weeks': r['weeks'],
                         'cash': r.get('cash'), 'failure': r.get('failure'),
                         'countsAsAdditionalFreshSample': False})

current_smokes = {}
for route, expected_week in [('free', 626), ('boosted', 769)]:
    base = Path(f'/tmp/ae-lifetime-current-smoke-{route}')
    r = read(base / route / 'career-0-results.json')
    prefix = json.loads(gzip.decompress((base / 'prefix.json.gz').read_bytes()))
    lineage = read(base / 'lineage.json')
    meta = read(base / 'executable.json')
    assert digest(base / 'prefix.json.gz') == lineage['sourceCheckpointSha256']
    assert digest(base / 'worker.mjs') == meta['sha256']
    assert r['status'] == 'LEGEND_PLUS_TWO_YEARS' and r['weeks'] == expected_week
    assert r['weeks'] - prefix['weeks'] == 14
    changed = [p for p, sha in meta['sourceHashes'].items() if digest(ROOT / p) != sha]
    assert not changed, changed
    current_smokes[route] = summarize(r) | {
        'handoffWeek': prefix['weeks'], 'additionalWeeks': 14,
        'sourceChangesSinceBundle': changed,
        'wholeLifetimeOnThisSnapshot': False,
        'lineage': lineage,
    }
    shutil.copyfile(base / 'executable.json', EVIDENCE / f'latest-smoke-{route}-executable.json')
    with gzip.open(EVIDENCE / f'latest-smoke-{route}-result.json.gz', 'wt') as f:
        json.dump(r, f, separators=(',', ':'))
endpoint_safety = read('/tmp/ae-lifetime-endpoint-safety.json')
assert endpoint_safety['passed'] and len(endpoint_safety['cases']) == 7

initial = read('/tmp/ae-lifetime-initial.json')
drift = [f for f, sha in initial.items() if (digest(ROOT / f) if (ROOT / f).is_file() else None) != sha]
verification = {
    'scope': 'Synthetic real-engine and real-action callbacks; isolated stores; not manual UI or real billing',
    'freshTrajectoryCount': 2, 'seeds': [0], 'adaptivePolicies': True,
    'balanceParametersRetunedThisTurn': False,
    'productionChangesThisTurn': ['Preserve signed finite cash during migration and valid legacy refund offsets',
                                 'New installments start their own campaigns; scoped legacy exposure reads do not retitle parent paid evidence'],
    'sources': source_checks, 'lineages': lineages,
    'concurrentTypeOnlyProof': type_proof,
    'currentWholeEconomySnapshotLifetimeValidated': not any(s['runtimeChangedSources'] for s in source_checks.values()),
    'concurrentEconomyRule': 'Preserve unrelated evolving source; any runtime drift means lifetime timings apply to the recorded pinned snapshot, not the new whole economy',
    'latestSourceFollowup': current_smokes,
    'finalEndpointSafety': endpoint_safety,
    'initialWorkspacePathCount': len(initial), 'initialPathsWithConcurrentChanges': drift,
    'concurrentPathsRestoredOrOverwritten': False,
    'build': read('/tmp/ae-lifetime-build-memory.json'),
    'focusedTypecheck': {'passed': not Path('/tmp/ae-lifetime-final-focused-typecheck.log').read_text().strip(),
                         'command': 'node --max-old-space-size=2304 node_modules/typescript/bin/tsc -p /tmp/ae-lifetime-final-tsconfig.json --noEmit'},
    'wholeWorkspaceTypecheck': {'passed': False, 'reason': 'V8 heap exhaustion at 2048 and 3072 MiB; not a type-error result'},
    'allTypeScriptSourcesCheck': {'passed': False, 'reason': 'Three existing includes-on-never errors in unchanged HEAD-identical scripts/audit-streaming-ident-defaults.tsx at35/36/45; generated JavaScript excluded in this diagnostic'},
    'independentScopedReview': 'No critical or important issues in either signed-wallet migration or installment exposure/funding fix; both read-only reviews',
    'lateLegacyDraftReview': 'No important issues; protects historical/owned/authored projects, child payments and reserves, retains genuine child promotion and NPC funding idempotence',
    'masteryPressureCasesComplete': len(mastery) == 3 and all(s.get('status') == 'HORIZON_COMPLETE' and s.get('comparisonWeeks') == 104 for s in mastery.values()),
    'gitCommitOrPush': False, 'realPurchases': False, 'personalSaveSlotsAccessed': False,
}
logs = {
    'wallet-red.log': '/tmp/ae-negative-wallet-red-expanded.log',
    'wallet-green.log': '/tmp/ae-negative-wallet-green.log',
    'save-migration.log': '/tmp/ae-negative-wallet-migration-regression.log',
    'save-generations.log': '/tmp/ae-negative-wallet-generations-regression.log',
    'legacy-career-compatibility.log': '/tmp/ae-continuation-career-compatibility.log',
    'production-build.log': '/tmp/ae-lifetime-build.log',
    'scoped-typecheck.log': '/tmp/ae-lifetime-final-focused-typecheck.log',
    'continuation-red.log': '/tmp/ae-cinema-continuation-red.log',
    'continuation-green.log': '/tmp/ae-cinema-continuation-green.log',
    'continuation-legacy-red.log': '/tmp/ae-cinema-continuation-legacy-red.log',
    'awareness.log': '/tmp/ae-continuation-awareness.log',
    'rights.log': '/tmp/ae-continuation-rights.log',
    'cinema-integration.log': '/tmp/ae-continuation-integration.log',
    'cinema-phase2.log': '/tmp/ae-continuation-phase2.log',
    'legacy-failed-save-quote.log': '/tmp/ae-lifetime-legacy-exposure.log',
    'whole-source-typecheck.log': '/tmp/ae-lifetime-all-ts-typecheck.log',
    'exposure-crash-exact-replay.log': '/tmp/ae-lifetime-exposure-red.log',
    'latest-source-free.log': '/tmp/ae-lifetime-current-smoke-free.log',
    'latest-source-boosted.log': '/tmp/ae-lifetime-current-smoke-boosted.log',
    'final-endpoint-roundtrips.log': '/tmp/ae-lifetime-endpoints.log',
}
for name, path in logs.items():
    shutil.copyfile(path, EVIDENCE / name)

for name, value in [('comparison.json', summaries), ('pressure-comparison.json', pressure),
                    ('controls.json', controls), ('verification.json', verification),
                    ('financial-witnesses.json', financial_witnesses), ('mastery-comparison.json', mastery),
                    ('near-mastery-baseline.json', near_mastery_baseline), ('matched-maxed-roles.json', matched_roles)]:
    (OUT / name).write_text(json.dumps(value, indent=2) + '\n')

fields = ['route', 'weeks', 'years', 'craft', 'fame', 'reputation', 'experience', 'cash', 'debt',
          'netCashAfterDebt', 'totalBorrowed', 'releasedCredits', 'cumulativeSalary', 'cumulativeCommission', 'arc']
with (OUT / 'curve.csv').open('w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    for route, r in results.items():
        for p in r['curve']:
            writer.writerow({k: p.get(k) for k in fields} | {'route': route, 'years': p['weeks'] / 52})

free, boosted = summaries['free'], summaries['boosted']


def milestone(value):
    return f"Week {value} ({value / 52:.2f} years)" if value is not None else 'Not reached'


def money(value):
    return f'${value:,.0f}' if value is not None else 'Not recorded'


rows = [
    ('First personal premiere', 'firstPremiere'), ('Average acting craft 50', 'craft50'),
    ('Fame 50', 'fame50'), ('First individual acting skill 95', 'anyActingSkill95'),
    ('Average acting craft 80', 'craft80'), ('First individual acting skill 100', 'anyActingSkill100'),
    ('First Industry Legend', 'legendWeek'), ('All seven acting skills 95', 'allActingSkills95'),
    ('All seven acting skills 100', 'allActingSkills100'),
]
milestone_table = '\n'.join(f"| {label} | {milestone(free[key])} | {milestone(boosted[key])} |" for label, key in rows)
mastery_table = '\n'.join(
    f"| {mode} | {s.get('comparisonWeeks', 0)} | {round(s['meanNewlyDeliveredPerformance'], 2) if s.get('meanNewlyDeliveredPerformance') is not None else 'Pending'} | {money(s.get('cash'))} | {s['status']} |"
    for mode, s in mastery.items()
)
matched_table = '\n'.join(f"| {r['name']} | {r['focused']} | {r['neglect']} | {r['overbooked']} |" for r in matched_roles)
finished = all(s['status'] == 'LEGEND_PLUS_TWO_YEARS' for s in summaries.values())
state = 'Both earned routes completed at least104 weeks after first Legend, including repaired-source continuation checks.' if finished else 'Verification is still in progress for at least one route; do not treat this snapshot as both routes completed.'
(OUT / 'README.md').write_text(f'''# Fresh start to Legend: career payoff and late challenge

{state}

**Verdict: a strong financial payoff is demonstrably possible. High skill still needs role preparation, but the actor-only wealth curve is not fully balanced.** Large contractual backend receipts can make ordinary career expenses comparatively small. A delayed Legend label alone does not establish engaging long-term play.

These are actual engine/actions/persistence tests on recorded source snapshots in isolated stores, not manual phone playthroughs. Two starting trajectories use seed 0, INITIAL_PLAYER, age 15, $2,000, zero acting skills and zero fame. Free receives no purchased resources. Boosted receives the existing simulated $75,000 cash and 500 energy products exactly once at the start; no later purchase or resource grant. Ordinary Bank loans remain debt, not earnings. No personal save or real billing was accessed.

## Current earned milestones

All times are elapsed **in-game** weeks/years, not real sessions/days. Craft is the mean of seven acting skills; writing is separate. These adaptive diagnostic journeys are not an unbiased cohort or a causal free-versus-paid experiment.

| Milestone | Free trajectory | One-time boosted trajectory |
|---|---:|---:|
{milestone_table}

| Latest measurement | Free | Boosted |
|---|---:|---:|
| Status | {free['status']} | {boosted['status']} |
| Elapsed weeks | {free['weeks']} | {boosted['weeks']} |
| Weeks after first Legend | {free['weeksAfterFirstLegend']} | {boosted['weeksAfterFirstLegend']} |
| Average craft | {free['craft']:.2f} | {boosted['craft']:.2f} |
| Fame | {free['fame']:.2f} | {boosted['fame']:.2f} |
| Reputation | {free['reputation']:.2f} | {boosted['reputation']:.2f} |
| Career experience | {free['experience']:.2f} | {boosted['experience']:.2f} |
| Released personal acting credits | {free['releasedCredits']} | {boosted['releasedCredits']} |
| Cash | {money(free['cash'])} | {money(boosted['cash'])} |
| Outstanding debt | {money(free['debt'])} | {money(boosted['debt'])} |
| Cash minus outstanding debt | {money(free['netCashAfterDebt'])} | {money(boosted['netCashAfterDebt'])} |
| Cumulative ordinary borrowing | {money(free['totalBorrowed'])} | {money(boosted['totalBorrowed'])} |
| Gross acting salaries received | {money(free['grossSignedActingSalaryReceived'])} | {money(boosted['grossSignedActingSalaryReceived'])} |
| Agent commissions actually debited | {money(free['agentCommissionsDebited'])} | {money(boosted['agentCommissionsDebited'])} |
| Verified reloads along carried path | {free['verifiedReloads']} | {boosted['verifiedReloads']} |

Salary is **not total income**: cinema/backend and streaming settlements are separate. Cash is after spending and obligations. Debt and the initial purchased grant are not acting revenue. Archived-credit counts exclude still-active releases; the table uses deduplicated released personal credits.

## What the current rules change

Earlier approved balance work makes low-level learning faster and tapers it toward mastery; paid preparation is project-specific, and concurrent productions share attention. A wrapped performance is frozen: later classes cannot upgrade an already delivered role. Manager support assists preparation, agent access does not replace craft, and PR depends on real work/audience and a ceiling. Commercial demand also depends on recent work/audience.

The most recent reward-pacing pass adds bounded learning while working (up to two learning increments per project per week, four before filming and 24 per new project), small once-only personal premiere recognition, proportional low-fame decay, and functioning paid PR at zero fame. It fixes duplicate prepaid staff charges. Existing active-project allowances, delivered performances, paid classes, signed money/commission and earned skills remain intact. It does not increase free weekly energy or change store grants/prices.

Legend additionally needs a personal body of work: 12 credits, at least 260 weeks since the first credit and three strong recent acting credits, alongside the existing high fame/reputation/experience and awards-or-project requirement. Existing qualifying careers are grandfathered. This is a standing requirement, not a forced hit/flop switch. A role can perform well inside a weak film, and a supporting actor can perform poorly inside a strong film.

These late rules were already present before this verification turn. **No balance parameters were retuned during verification.** Two production bugs were repaired: signed-cash migration and installment-specific campaign ownership. New installments now require their own producer-funded campaign instead of inheriting paid evidence. The observed current Legend time cannot be presented as a measured before/after improvement from the community's two-to-three-year anecdote; an equivalent old-rule lifetime sample was not run.

## Does mastery remove challenge?

Three 52-week cases forked the same earned week 320 free checkpoint (craft 80.45, one skill 95+). Focused preparation ended with recent performance 87.4 and cash $298,993. Neglected rehearsal ended at 81.4 and $227,027. Overbooking up to three shoots ended at 80.5 and $6,358,453. These include prior delivered credits; future actions also consume different RNG. This is scenario evidence, not an isolated causal estimate or win-rate calibration.

The overbooked actor's new Shawshank supporting performance was 56, while the project package quality was 98.468. Its signed 2.5% backend paid $6,296,323 by week 372 against real receipts; canonical settlement replay was rejected. This is a legitimate contract reward and a **counterexample to claiming that lower personal preparation always means less money**. Final canonical payout witnesses are preserved separately.

The selected free path follows that actual successful branch. It reached Legend at 495 with $12,341,098 and continued to 599 with $27,818,999. In that later 104-week window cash never fell below about$12.28M. Thus ordinary actor costs do not establish sustained financial pressure after a major windfall. The boosted route also had financial difficulty before recovering; boosts did not grant Legend or fabricate film quality.

Individual mastery and the boosted actor's eventual seven-skill100 milestone were earned naturally; all-genre mastery is **not** established. The course policy enrolls one class at a time; these are not fastest-possible UI-legal timings. Full studio/platform ownership and a self-funded empire were not tested by these actor careers.

The final comparison starts from the same actual boosted week755 state, after Legend and after **all seven acting skills reached100** at739. It changes only subsequent preparation/workload choices for104 weeks. Each case first completed52 weeks and saved at807, then continued to859 with the player/RNG/clock unchanged; the second year covers the next future-booked role's wrap. The table uses **newly delivered personal roles**, excluding performances already frozen at the fork. Existing delivered performances must remain identical. Skills are not edited to create this fixture.

| All-skills100 scenario | New weeks | Mean new delivered performance | Ending cash | Status |
|---|---:|---:|---:|---|
{mastery_table}

Role mixes differ between the strategies, so their overall performance means must not be treated as matched-role penalties. The same originally booked films provide a narrower comparison:

| Same newly delivered role | Focused | No rehearsal | Up-to-three current slots |
|---|---:|---:|---:|
{matched_table}

Different actions can consume different later RNG; this is not a calibrated hit/flop probability comparison. Ongoing backend income can originate from work delivered before the fork. A conservative control counted even distant scheduled franchise bookings as current workload. That prevented a useful new-slot comparison, so it is retained separately; the final policy counts current shoots and signed starts within13 weeks. All distant contracts remain binding and run normally. No in-game scheduling rule was changed. Earlier near-mastery cases at681–733 also remain as baseline evidence. See mastery-comparison.json for each role, source hashes, unchanged prefix and signed-state persistence.

## Retained adverse cases and policy lineage

The first boosted health-naive trajectory actually died at week 116. Generic Improve checkups did not treat the existing specific condition. Its outcome remains retained. Health-aware continuations start from its actual living week 104 checkpoint and pay the real Clinic; no resurrection or rerolled prefix. Other conservative policies became unfunded, including a real annual fee taking cash to -$33,019. An audit UNFUNDED stop is not an actual in-game death.

The cautious policy also under-prioritized higher-paid direct offers. Subsequent scenarios use existing visible larger roles and native acceptance rules. The free selected branch, ordinary bridge loans and later live-debt continuation are explicitly recorded. Policies were refined during diagnosis, and successful branches were selected; **these are two starting trajectories with scenario forks, not many independent successful fresh careers**. Failed controls remain in controls.json and chronological progress.md.

The final boosted continuation retains the real week 385 negative wallet and loans. Real credit declines, repayments/defaults, health and death remain active. The verifier permits negative cash because the actual game does; it does not artificially terminate that playable state. No scenario edits skills, fame, player resources, project quality, signed contracts or RNG to cross a gate.

## Save-safety bug found and repaired

The verified save generation retained -$33,019, but migration clamped it to $0. The lifetime protected-state assertion failed. Both finite signed cash and valid legacy-refund offsets now survive migration. The refund remains once-only; invalid/nonfinite imports still require the existing recovery flow. No historical balances are recreated or refunded.

The dedicated regression passed after reproducing both failures before the fix. Save-migration, save-generations and legacy-career compatibility passed, including 14 actual weeks/15 reloads, existing shares/skills/Legend and signed salary/commercial payments. Read-only scoped review found no critical or important issue. Final trajectories repeatedly verify cash, credit/debt, skills, fees, ownership and signed production terms across save/reload, plus cinema settlement replay protection.

## Long-career crash reproduced and repaired

The boosted career reached Legend651, then advancing beyond733 crashed with `Exposure belongs to a different cinema title`. Parasite2 had copied the parent film's paid announcement/campaign and launch-funded marker. The live cinema adapter silently relabeled those parent events, but the later streaming-rights read rejected their identity. This could also let a new installment skip its own producer campaign funding.

The fix clears only new sequel/renewal offers' per-installment campaign evidence, launch marker and paid/reserved campaign counters. New NPC campaigns debit the actual producer treasury exactly once. Existing saves are read by title identity: foreign parent evidence is excluded, never retitled as a new paid campaign. Core identity rejection, cost bounds and duplicate-settlement guards remain. Parent history, existing earned cash, signed actor percentages and contracts are not rewritten or refunded.

A final compatibility guard handles already-saved **unreleased NPC sequel drafts** with unambiguous copied positive funding markers. It requires foreign paid evidence and no genuine child payment or explicit reserved budget; owned/authored and every historical/released title are protected first. Genuine child promotion is preserved, the actual NPC funds its new campaign once, and no player wallet is charged. Ambiguous legacy funding is retained. This late guard is separately identified in source-drift evidence and covered by the expanded12-case RED→GREEN suite, scoped review and current-source follow-up checks; the long frozen runs preceded it.

The latest-source follow-up then advanced the earned free612 checkpoint to626 and boosted755 to769: **14 more real weeks each**, including the late compatibility guard and current concurrent NPC-budget source. Ending cash was $35,821,692/free and $42,011,041/boosted. Every bundled source hash still matched when this report was generated. This is a compatibility/integration follow-up, not a new fresh-to-Legend validation of the concurrent economy changes. Seven final endpoints (both main careers, three full-mastery branches and both latest-source follow-ups) passed independent prepare → verified save → reload → migration round trips; wallets, loans/credit, skills/stats, shares, businesses, team terms, awards and signed project/streaming terms were preserved. Source checkpoint bytes and caller objects remained unchanged.

The frozen original681 checkpoint reproduced every successful weekly measurement and the same733 crash. An exact pre-fault replay recovered clean729 before continuing on repaired source to755. This avoids resuming from a failed engine call's consumed RNG. The original failed733 snapshot is retained; its$41,177,655 wallet, loan state and serialized streaming terms passed the direct repaired quote/import probe unchanged. Free completed599 then13 additional repaired-source weeks to612. These are documented patch-forward continuations, **not a claim that every historical week ran on the final repair**. Twelve new ownership/funding/read/reload regressions passed. Awareness, rights, phase2, live cinema integration and legacy career compatibility passed; independent read-only review found no critical or important issue.

## Remaining work and limits

1. **Keep the earned payoff.** Evaluate new-offer/backend terms and expected package economics prospectively; never claw back current money or existing contractual percentages. One supporting-film windfall should not be mistaken for an actor's universal drawing power.
2. **Validate fair consequences.** Some well-rated streaming credits still have a failure label alongside zero receipts and a LEGACY_SNAPSHOT/LEGACY_PAID zero-value contract. For example, Violet Dust has a 7.79 rating, personal performance 91 and 37.3M views, but recorded receipts $0. An ID alone does not establish that producer ROI is observable. Reconcile actual settlement/placeholder provenance before using such labels as evidence that low reputation is fair challenge. This turn does not rewrite receipts, history or reputation; witnesses are retained for follow-up.
3. **Test distribution, not one winning story.** Run a frozen multi-seed policy matrix (casual/free, focused/free, single-boost and repeat-boost) before further tuning. Measure premiere gaps, skill milestones, debt/defaults, work quality and post-windfall choice sensitivity. Do not guarantee outcomes to reach a target.
4. **Real sessions and monetization remain unverified.** In-game years are not retention days. These cases do not establish player friction, D7/D30 uplift, conversion or boost revenue. Reward pacing and monetization require released-version matched cohorts and actual playtime instrumentation.

The final affected-source TypeScript check and guarded production build passed (2048MiB build heap; peak{verification['build']['peakOwnedTreeRssMiB']}MiB; no guard stop). Raw whole-workspace checks exhausted2048/3072MiB heaps. A diagnostic excluding generated JavaScript completed with three existing `includes`-on-`never` errors in unchanged HEAD-identical `scripts/audit-streaming-ident-defaults.tsx` at35/36/45. **Full workspace typecheck is not claimed passed**; the unrelated audit was preserved. Existing Browserslist/chunk notices remain non-blocking.

The six main repair sources remain identical to their final pinned versions; the separately tested late legacy-draft guard is identified above. **Concurrent unrelated NPC investment/economy work changed after the lifetime executables were frozen.** Source drift is recorded in verification.json; no current-whole-economy lifetime green light is claimed. The numerical career/wealth timings apply to the recorded snapshot and patch-forward histories. Retest a frozen current full economy before using these as forecasts for its new NPC budget scope. Optional type-only edits are separately checked by transpiled-runtime equality; they never excuse runtime drift. Earlier source pins and RED failures remain explicit historical evidence. All initial77 dirty/untracked paths were preserved; concurrent cohort/report/type/helper edits are listed and were left untouched. No reset, clean, branch switch, commit or push was performed.

## Evidence

- [Milestones and endpoint balances](comparison.json), [weekly curves](curve.csv), [pressure comparison](pressure-comparison.json).
- [Earned all-seven-skills100 comparison and newly delivered roles](mastery-comparison.json), [matched roles](matched-maxed-roles.json).
- [Canonical payouts and streaming-label witnesses](financial-witnesses.json), [adverse controls](controls.json), [verification and immutable prefix hashes](verification.json).
- Compressed complete result/action/curve logs and source pins are in evidence/. Full isolated game-world checkpoints and frozen executables remain under /tmp/ae-lifetime-*. These temporary replay files are not user saves and their long-term availability is not guaranteed.
- Rebuild the signed-wallet regression with `node_modules/.bin/esbuild scripts/audit-actor-negative-wallet.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/ae-negative-wallet-repro.mjs`, then run `node /tmp/ae-negative-wallet-repro.mjs`.
- `scripts/run-actor-lifetime.mjs` can resume matching pinned checkpoint roots. It rejects an executable/horizon mismatch. Preparation scripts preserve source prefixes and refuse to replace existing run roots. The policy versions and handoff metadata explain why the original fresh runner alone is not the full adaptive-success scenario.
''')

print(json.dumps({'summaries': summaries, 'verification': verification, 'pressure': pressure}, indent=2))
