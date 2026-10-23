"""Read-only final report. Requires every pinned 52-week case to be complete."""
import gzip
import hashlib
import json
import shutil
from pathlib import Path
from statistics import mean, median

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/reports/2026-10-23-future-actor-terms'
EVIDENCE=OUT/'evidence'
EVIDENCE.mkdir(parents=True,exist_ok=True)
def read(p): return json.loads(Path(p).read_text())
def zipped(p): return json.loads(gzip.decompress(Path(p).read_bytes()))
def digest(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def money(n): return f'${n:,.0f}'

expected={'services/famousMovieLogic.ts','services/roleLogic.ts','services/teamLogic.ts','services/universeLogic.ts'}
baseline=read('/tmp/ae-future-money-baseline/source.json')
tuned=read('/tmp/ae-future-money-balanced/source.json')
changed={p for p,h in baseline['sourceHashes'].items() if tuned['sourceHashes'].get(p)!=h}
assert changed==expected,changed
assert set(tuned['sourceHashes'])-set(baseline['sourceHashes'])=={'services/actorOfferTerms.ts'}
assert all(digest(ROOT/p)==h for p,h in tuned['sourceHashes'].items()),'Current source drifted from candidate'

cases=[]
final_players={}
for variant in ['baseline','balanced']:
 for route in ['free','boosted']:
  root=Path(f'/tmp/ae-future-money-{variant}/{route}')
  lineage=read(root/'lineage.json');prefix=zipped(root/'prefix.json.gz')
  assert digest(root/'prefix.json.gz')==lineage['sourceCheckpointSha256']
  initial=prefix['player'];old_signed=dict(prefix['signed'])
  old_ids={p['id'] for p in initial['commitments']+initial['activeReleases']+initial['pastProjects']}
  old_titles=initial['world']['cinemaMarket']['titles']
  for seed in [0,7,19]:
   c=zipped(root/route/f'career-{seed}.json.gz');r=read(root/route/f'career-{seed}-results.json')
   assert r['status']=='HORIZON_COMPLETE' and r['weeks']==lineage['horizon'],(variant,route,seed,r['status'],r['weeks'])
   assert r['weeks']-prefix['weeks']==52
   assert c['executable']==digest(root/'worker.mjs')
   p=c['player'];signed=dict(c['signed']);rows={q['id']:q for q in p['commitments']+p['activeReleases']+p['pastProjects']}
   for old in initial['commitments']:
    if old['type']!='ACTING_GIG':continue
    assert signed.get(old['id'])==(old.get('lumpSum') or 0),old['id']
    if old['id'] in {q['id'] for q in p['commitments']+p['activeReleases']}:
     assert rows[old['id']].get('royaltyPercentage')==old.get('royaltyPercentage'),old['id']
   for old in initial['activeReleases']:
    if old['id'] in {q['id'] for q in p['activeReleases']}:
     assert rows[old['id']].get('royaltyPercentage')==old.get('royaltyPercentage'),old['id']
   old_contracts=initial['world'].get('streamingRightsContracts',{})
   for key,contract in old_contracts.items():
    current=p['world']['streamingRightsContracts'].get(key)
    assert current is not None,key
    for field in ['minimumGuarantee','productionFunding','futureSeasonFunding','licensorRevenueShare','backendBasis','backendCap','guaranteeRecoupment']:
     assert current.get(field)==contract.get(field),(key,field)
   new_signed=[]
   for key,pay in signed.items():
    if key in old_signed:continue
    row=rows.get(key,{})
    new_signed.append({'id':key,'name':row.get('name'), 'role':row.get('roleType'),'salary':pay,
      'pointsIfStillLive':row.get('royaltyPercentage'),'phase':row.get('projectPhase')})
   payouts=[]
   for key,title in p['world']['cinemaMarket']['titles'].items():
    paid=(title.get('actorPaidCents',0)-old_titles.get(key,{}).get('actorPaidCents',0))/100
    if paid:payouts.append({'id':key,'name':rows.get(key,{}).get('name'), 'paid':paid,'existingAtFork':key in old_ids})
   post_actions=[a for a in r['actions'] if a['week']>=prefix['weeks']]
   assert not any(a['type'].startswith('simulated-purchase:') for a in post_actions)
   purchase_bonus=sum(-a['cost'] for a in post_actions if a['type'].startswith('accept-inbox:') and a['cost']<0)
   case={'variant':variant,'route':route,'seed':seed,'start':prefix['weeks'],'end':r['weeks'],'weeks':52,
      'status':r['status'],'startingCash':initial['money'],'endingCash':p['money'],'cashChange':p['money']-initial['money'],
      'craft':r['curve'][-1]['craft'],'fame':p['stats']['fame'],'reputation':p['stats']['reputation'],
      'newlyObservedRoleQuotes':new_signed,'totalNewlyObservedRoleQuotedPay':sum(a['salary'] for a in new_signed),
      'allAcceptanceCashCredits':purchase_bonus,'theatricalPayouts':payouts,
      'additionalVerifiedReloads':r['reloads']-prefix['reloads'],'additionalSettlementReplayRejections':r['replays']-prefix['replays'],
      'existingSignedTermsPreserved':True,'prefixSha256':lineage['sourceCheckpointSha256'],
      'checkpointSha256':digest(root/route/f'career-{seed}.json.gz')}
   cases.append(case);final_players[(variant,route,seed)]=p
   with gzip.open(EVIDENCE/f'{variant}-{route}-{seed}-result.json.gz','wt') as f:json.dump(r,f,separators=(',',':'))
  shutil.copyfile(root/'executable.json',EVIDENCE/f'{variant}-{route}-executable.json')
  shutil.copyfile(root/'lineage.json',EVIDENCE/f'{variant}-{route}-lineage.json')

matched_payouts=[]
for route in ['free','boosted']:
 for seed in [0,7,19]:
  left=final_players[('baseline',route,seed)];right=final_players[('balanced',route,seed)]
  names_a={r['id']:r for r in left['activeReleases']+left['pastProjects']}
  names_b={r['id']:r for r in right['activeReleases']+right['pastProjects']}
  a=left['world']['cinemaMarket']['titles'];b=right['world']['cinemaMarket']['titles']
  for key in a.keys()&b.keys():
   if key not in names_a or key not in names_b or names_a[key]['name']!=names_b[key]['name']:continue
   old_points=names_a[key].get('royaltyPercentage');new_points=names_b[key].get('royaltyPercentage')
   if old_points is None or new_points is None or old_points==new_points:continue
   perf=lambda row:row.get('playerRolePerformance',row.get('productionPerformance'))
   matched_payouts.append({'route':route,'seed':seed,'titleId':key,'name':names_a[key]['name'],
    'oldPoints':old_points,'newPoints':new_points,'oldActorPaid':a[key]['actorPaidCents']/100,'newActorPaid':b[key]['actorPaidCents']/100,
    'sameGross':a[key]['grossCents']==b[key]['grossCents'],'gross':b[key]['grossCents']/100,
    'sameProducerReceipts':a[key]['producerReceiptsCents']==b[key]['producerReceiptsCents'],
    'samePersonalPerformance':perf(names_a[key])==perf(names_b[key]),'personalPerformance':perf(names_b[key])})
witness=next(w for w in matched_payouts if w['route']=='boosted' and w['seed']==7 and w['name']=='The Sixth Sense')
assert witness['sameGross'] and witness['sameProducerReceipts'] and witness['samePersonalPerformance']

groups=[]
for route in ['free','boosted']:
 for variant in ['baseline','balanced']:
  rows=[c for c in cases if c['variant']==variant and c['route']==route]
  groups.append({'route':route,'variant':variant,'cases':len(rows),'medianCashChange':median(c['cashChange'] for c in rows),
   'minimumCashChange':min(c['cashChange'] for c in rows),'maximumCashChange':max(c['cashChange'] for c in rows),
   'meanNewlyObservedRoleQuotedPay':mean(c['totalNewlyObservedRoleQuotedPay'] for c in rows)})

initial=read('/tmp/ae-future-terms-initial.json')
drift=[p for p,h in initial.items() if (digest(ROOT/p) if (ROOT/p).is_file() else None)!=h]
concurrent={'docs/reports/2026-10-23-npc-market-budgets/progress.md','scripts/audit-cinema-normal-cohort.ts'}
assert set(drift)<=expected|concurrent,drift
verification={'all12CasesCompleted':True,'totalActualAdditionalGameWeeks':sum(c['weeks'] for c in cases),
 'futureSeeds':[0,7,19],'independentFreshCareers':False,'matchedConditionalCareerFixtures':2,
 'startingPlayerUnmodified':True,'runtimeChangedPaths':sorted(changed|{'services/actorOfferTerms.ts'}),
 'candidateSourcesStillMatchCurrent':True,'existingSignedAndStreamingTermsChecked':True,
 'additionalVerifiedReloads':sum(c['additionalVerifiedReloads'] for c in cases),
 'additionalDuplicateSettlementRejections':sum(c['additionalSettlementReplayRejections'] for c in cases),
 'initialDirtyUntrackedPaths':len(initial),'initialPathsChangedThisTask':sorted(set(drift)&expected),
 'concurrentUnrelatedPathChanges':sorted(set(drift)&concurrent),'unrelatedChangesRestoredOrOverwritten':False,
 'independentReview':'No critical production issues; experiment evidence overwrite guard and salary concession assertion feedback addressed',
 'build':read('/tmp/ae-future-terms-build-memory.json'),
 'focusedTypecheckPassed':not Path('/tmp/ae-future-terms-typecheck.log').read_text().strip(),
 'fullWorkspaceTypecheckPassed':False,
 'fullWorkspaceTypecheckNote':'Not repeated: previous full-scope diagnostic has pre-existing includes-on-never audit errors; raw generated-JS configurations exhausted heap',
 'noRealPurchases':True,'noPersonalSaves':True,'commitOrPush':False}
assert verification['build']['exitCode']==0 and verification['focusedTypecheckPassed']
for name,source in [('terms-green.log','/tmp/ae-future-terms-green.log'),('cinema-integration.log','/tmp/ae-future-terms-integration.log'),
 ('legacy-career-compatibility.log','/tmp/ae-future-terms-compatibility.log'),('old-earned-endpoints.log','/tmp/ae-future-terms-old-endpoints.log'),
 ('build.log','/tmp/ae-future-terms-build.log'),('focused-typecheck.log','/tmp/ae-future-terms-typecheck.log')]:shutil.copyfile(source,EVIDENCE/name)
for name,value in [('cases.json',cases),('comparison.json',groups),('verification.json',verification),('matched-payouts.json',matched_payouts)]:
 (OUT/name).write_text(json.dumps(value,indent=2)+'\n')

table='\n'.join(f"| {c['route']} | {c['seed']} | {money(c['cashChange'])} | {money(next(t for t in cases if t['variant']=='balanced' and t['route']==c['route'] and t['seed']==c['seed'])['cashChange'])} |" for c in cases if c['variant']=='baseline')
(OUT/'README.md').write_text(f'''# Future actor offers: late-game money balance

The prospective change reduces automatic windfalls while preserving existing wealth, displayed offers, signed packages and actual payout formulas. No quality, audience, hit/flop, energy, store, tax or operating-cost rule was changed.

## What changed

- Famous movie and series salary amounts are unchanged. New backend quotations depend on billing size and this actor's fame/reputation/recent personal work/audience; skill100 and wallet size alone do not earn lead-level points.
- Maximum new movie points: lead1.50, ensemble0.97, supporting0.67, cameo0.03, minor0. Series uses the existing lower base. Actual recent standing can quote less. These are new-offer rates, not caps on player wealth or existing contracts.
- New franchise guarantee reflects the number and billing size of remaining installments and the new package's production budget. The20% signing-bonus rule is unchanged; its value follows the newly quoted guarantee. One role-weighted quoted point rate covers the signed package. Its future installments are then protected.
- A new sequel's upfront concession follows its actual offered points rather than a flat25%. A new independent season offer receives a new quote rather than automatically copying a prior large point rate. Earlier installments and already displayed/signed offers retain their terms.
- Ordinary audition pay, player shares, savings, loans, NPC talent pay, revenue accounting, agent commission and settlement replay protection are unchanged.

## First: eight-seed quotation experiment

Before production edits,264 quotes covered seeds0/7/19/31/43/59/71/97, entry/free/boosted standing, five billing sizes, movie/series and actual remaining franchise packages. Light/balanced/strict options were compared. The moderate option keeps famous salaries and clear upside; the stronger option reduces lead points to at most1%, while the lighter option leaves larger automatic windfalls. The captured pre-change JSON and frozen executable are in evidence. Counterfactual backend on an assumed250M profit is a quotation sensitivity calculation, not an earned payout or simulated hit rate.

## Then: full real-engine multi-seed continuations

Both frozen variants used the identical existing actor policy and source snapshot except the five listed quotation files. Each runs free/boosted × future seeds0/7/19 for52 actual weeks: **12 completed cases,624 additional game weeks**. The free fixture starts at its earned week612, craft98.17; boosted starts at earned755, all seven acting skills100. No player stats, existing cash/contracts, histories, prior performances or resources were edited. Future RNG is explicitly forked per seed. These are two career fixtures under six future-seed branches, not six independent fresh careers or a free-versus-paid conversion experiment.

| Earned route | Future seed | Old-rule cash change,52w | New-rule cash change,52w |
|---|---:|---:|---:|
{table}

One matched newly accepted film directly exercises the new backend: **The Sixth Sense**, boosted seed7. Salary remained200,000; personal performance93 and project quality93.16 were identical. Theatrical gross was439,107,226.62 in both, and collected producer receipts were identical. New quoted points were1.37 versus the old2.5, so actual canonical actor payments were2,583,743 versus4,714,859. The cash difference is2,131,116. This is a smaller prospective contractual share of the same successful film, not a forced flop or weaker performance. See matched-payouts.json.

Cash change includes real spending, old backend income, new salaries/bonuses and all other ongoing obligations; it is not solely new-offer income. In particular, old deals can dominate the first year. Existing pending offers and every already accepted multi-film installment remain grandfathered. A signed backlog finishing after this horizon is not counted as future earned income merely because its guarantee is known. Newly observed role-pay totals include auditions, some old displayed offers and booked roles; they are quotation/booking totals, not earned income or exclusively finalized guarantees. See individual cases and payout attribution in cases.json. Changing future guaranteed pay may change subsequent role choices or NPC finances, so aggregate wealth differences are scenario results, not isolated causal film-quality penalties.

These actors remain wealthy. This patch cannot—and deliberately does not—make an existing millionaire poor. It removes uniform lead-level points and flat30–40M guarantees from future small/short packages. Strong personal work, substantial roles and successful films still retain real upside. The first-year actor-only comparison does not establish full studio/streaming empire balance, real-session friction, retention or monetization. A broader released-version cohort remains necessary for population claims.

## Safety and checks

Nine current quote/contract regressions passed after five intended RED failures. They cover billing and personal demand, unchanged quality/RNG and famous salary, new renewal/sequel terms, exact proportional salary concession, variable franchise quotes, no wallet surcharge, old displayed-offer acceptance and real verified save/reload.32-group cinema integration and legacy compatibility (14 actual weeks/15 reloads) passed. Seven earlier naturally earned endpoint checkpoints independently passed verified round trips. Every long case checks persistence and rejects duplicate cinema settlement; this matrix adds{verification['additionalVerifiedReloads']} verified reloads and{verification['additionalDuplicateSettlementRejections']} replay rejections. Existing signed acting terms and core streaming financial terms were compared with each source checkpoint.

Affected-source TypeScript and the guarded production build passed (heap2048MiB; peak{verification['build']['peakOwnedTreeRssMiB']}MiB). Full-workspace TypeScript is not claimed green; previous unrelated audit errors and raw generated-JS heap exhaustion remain documented in the prior lifetime report. Independent read-only review found no critical production issue; evidence-overwrite and concession-test feedback was addressed. The first parallel build was stopped by its swap-growth guard and is retained in evidence; the final repeat passed. All{len(initial)} initially dirty/untracked paths were retained, including concurrent unrelated cohort-audit/report edits. Only the scoped roleLogic additions changed an already dirty production file. No unrelated work was restored or overwritten; no personal save, real purchase, reset, stage, commit or push.

## Evidence and reproduction

- [Per-case cash, quoted pay and payouts](cases.json), [group comparison](comparison.json), [same-film payout comparison](matched-payouts.json), [source/prefix safety and checks](verification.json).
- evidence/ contains compressed full action/curve results, pinned source manifests, lineage and verification logs. Raw world checkpoints and executable bundles remain under `/tmp/ae-future-money-*`; their long-term availability is not guaranteed.
- Pre-change quote executable: decompress evidence/prechange-quote-experiment.mjs.gz and run with a **fresh** TERMS_EXPERIMENT_OUT. Its exact old generator code is pinned. The source experiment refuses overwrites or current-generator mislabeling.
- `FUTURE_VARIANT=<new-name> node scripts/prepare-actor-future-money.mjs` prepares a new snapshot from the two earned lifetime checkpoints; replay via the existing run-actor-lifetime runner with DRAMA, six-week batches, LIFETIME_DECISIONS=overbooked, seeds0,7,19 and per-route horizon664/free or807/boosted. This requires the recorded temporary source fixtures; do not substitute an invented maxed player and describe it as naturally earned.
''')
print(json.dumps({'comparison':groups,'verification':verification},indent=2))
