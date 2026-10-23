from pathlib import Path
import tempfile,os,json,hashlib,subprocess,shutil,time,signal,fcntl
root=Path('/private/tmp/actor-fair-cinema-fixes-20261023');base=Path(tempfile.mkdtemp(prefix='cinema-runner-lifecycle-'));parent_lock=Path(tempfile.gettempdir())/'actor-cinema-career-audit.lock'
source="""import{writeFileSync,readFileSync}from'node:fs';import{createHash}from'node:crypto';import{dirname,join}from'node:path';import{fileURLToPath}from'node:url';const dir=dirname(fileURLToPath(import.meta.url));writeFileSync(join(dir,'imported'),'yes');writeFileSync(join(dir,'worker.pid'),String(process.pid));if(process.env.CINEMA_GUARD_WAIT==='1')await new Promise(r=>setTimeout(r,120000));writeFileSync(join(dir,'career-0.json'),JSON.stringify({status:'HORIZON_COMPLETE',horizon:26,executedWeeks:26,executionCodeSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex')}));"""
sig=hashlib.sha256(source.encode()).hexdigest();command=['node','docs/reports/2026-10-22-box-office-revamp/career-economics/run-audit.mjs'];outcomes={};orphan=None;controller=None

def fixture(name):
 p=base/name;p.mkdir();(p/'normal-career.mjs').write_text(source);(p/'executable-metadata.json').write_text(json.dumps({'sha256':sig,'entrypoint':'audit-normal-career.ts'}));return p

def env(p,wait='0'):
 return dict(os.environ,CAREER_OUTPUT=str(p),CAREER_SEEDS='0',CAREER_WEEKS='26',CAREER_BATCH_WEEKS='13',CAREER_MAX_BATCHES='1',CAREER_CHILD_HEAP_MB='256',CINEMA_GUARD_WAIT=wait)

def call(p):return subprocess.run(command,env=env(p),capture_output=True,text=True,timeout=15)
try:
 p=fixture('terminal');report=p/'career-0.json';report.write_text(json.dumps({'status':'CAREER_ENDED_DEATH','horizon':26,'executedWeeks':1,'executionCodeSha256':sig}));before=report.read_bytes();r=call(p);assert r.returncode==0 and 'RETAIN_COMPLETED_RESULT' in r.stdout and before==report.read_bytes() and not (p/'imported').exists(),r.stderr;outcomes['completedDeathRetainedWithoutCheckpoint']=True
 p=fixture('duplicate')
 with parent_lock.open('a+') as handle:
  fcntl.flock(handle.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB);r=call(p);assert r.returncode!=0 and 'already running' in r.stderr and not (p/'imported').exists(),r.stderr
 outcomes['kernelParentLockBlocksDuplicateController']=True
 p=fixture('orphan');log=(p/'controller.txt').open('w');controller=subprocess.Popen(command,env=env(p,'1'),stdout=log,stderr=subprocess.STDOUT)
 for i in range(200):
  if (p/'worker.pid').exists():break
  if controller.poll() is not None:raise AssertionError((p/'controller.txt').read_text())
  time.sleep(.02)
 assert (p/'worker.pid').exists(),'Stub worker did not start';orphan=int((p/'worker.pid').read_text());controller.kill();controller.wait();log.close()
 blocked=fixture('blocked-by-orphan');r=call(blocked);text=r.stderr+((blocked/'career-0.txt').read_text() if (blocked/'career-0.txt').exists() else '');assert r.returncode!=0 and not (blocked/'imported').exists() and 'Another audit worker is active' in text,text;outcomes['orphanWorkerBlocksNewHeavyImport']=True
 os.kill(orphan,signal.SIGKILL);orphan=None;time.sleep(.1)
 recovered=fixture('after-kill');r=call(recovered);assert r.returncode==0 and (recovered/'imported').exists(),r.stderr;outcomes['kernelWorkerLockRecoversAfterSigkill']=True
 r=call(recovered);assert r.returncode==0 and 'RETAIN_COMPLETED_RESULT' in r.stdout;outcomes['pinnedCompletedResultRetained']=True
 p=fixture('failed');report=p/'career-0.json';report.write_text(json.dumps({'status':'AUDIT_OR_POLICY_FAILURE','horizon':26,'executedWeeks':1,'executionCodeSha256':sig}));before=report.read_bytes();r=call(p);assert r.returncode!=0 and 'RETAIN_FAILED_RESULT' in r.stdout and before==report.read_bytes() and not (p/'imported').exists();outcomes['failedResultPreserved']=True
 (root/'efficient-runner-lifecycle.json').write_text(json.dumps(outcomes,indent=2));print(json.dumps(outcomes))
finally:
 if controller and controller.poll() is None:controller.kill();controller.wait()
 if orphan:
  try:os.kill(orphan,signal.SIGKILL)
  except ProcessLookupError:pass
 shutil.rmtree(base)
