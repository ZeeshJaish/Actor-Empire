"""Read-only summary of checkpointed lifetime audit outputs."""
import json,sys
from pathlib import Path
roots=[Path(x) for x in sys.argv[1:]] or [Path('/tmp/ae-lifetime-v2-free/free'),Path('/tmp/ae-lifetime-v2-boosted/boosted')]
for root in roots:
 p=root/'career-0-results.json'
 if not p.exists(): continue
 try:r=json.loads(p.read_text())
 except json.JSONDecodeError:continue
 if 'strategy' not in r:
  print(json.dumps({'route':root.name,'status':'AWAITING_FIRST_BATCH','week':r['weeks']}));continue
 curve=r['curve']; last=curve[-1]
 def first(fn):return next((c['weeks'] for c in curve if fn(c)),None)
 print(json.dumps({'route':r['strategy'],'status':r['status'],'week':r['weeks'],'years':round(r['weeks']/52,2),'cash':round(r['cash']),'craft':round(last['craft'],2),'fame':round(r['fame'],2),'rep':round(r['reputation'],2),'xp':round(r['experience'],2),'credits':len(r['credits']),'firstCredit':first(lambda c:c['releasedCredits']>0),'craft50':first(lambda c:c['craft']>=50),'craft80':first(lambda c:c['craft']>=80),'anySkill95':first(lambda c:max(c['skills'].values())>=95),'allActing95':first(lambda c:min(v for k,v in c['skills'].items() if k!='writing')>=95),'fame50':first(lambda c:c['fame']>=50),'fame94':first(lambda c:c['fame']>=94),'legendWeek':r.get('legendWeek'),'salary':last.get('cumulativeSalary'),'commission':last.get('cumulativeCommission'),'followers':last.get('followers'),'recentWork':last['careerEvidence'],'reloads':r['reloads'],'bonusEnergy':r['bonusEnergyBank'],'failure':r.get('failure')}))
