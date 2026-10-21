"""Refresh Lotte from the existing local MarketBot executor, at most every 6h.

Uses the same honest UA, robots rules and verified TLS as the normal collector.
Publishes only its data file atop the newest remote tree; never resets/checks out
user files, force-pushes, changes schedules, or copies credentials.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
from datetime import datetime, timezone
from collect_retail_promotions import PublicReader, text, merge_catalog
from collect_more_retail import collect_lotte
from merge_retail_catalogs import merge

ROOT = Path(__file__).resolve().parent.parent
DATA = 'marketbot-data/retail-promotions.json'

def git(*args, data=None, env=None):
    return subprocess.check_output(['git', *args], cwd=ROOT, input=data, env=env).decode('utf-8').strip()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--force',action='store_true');args=parser.parse_args()
    lock=Path(git('rev-parse','--absolute-git-dir'))/'marketbot-lotte.lock'
    try:
        handle=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY)
    except FileExistsError:
        raise SystemExit('Another local Lotte refresh owns the lock; no duplicate run')
    try:
        git('fetch','origin','main')
        old=json.loads(git('show','origin/main:'+DATA))
        now=datetime.now(timezone.utc)
        observed=[datetime.fromisoformat(o['lastSeenAt'].replace('Z','+00:00')) for o in old['offers'] if o['retailer']=='lotte' and o['kind']=='product']
        if observed and (now-max(observed)).total_seconds()<6*3600 and not args.force:
            print(json.dumps({'status':'skipped_fresh','lastSuccess':max(observed).isoformat()}));return
        rows,state=collect_lotte(PublicReader(),text,now.isoformat())
        if state['status']!='verified' or not rows:
            raise SystemExit('Lotte refresh failed: '+json.dumps(state,ensure_ascii=False))
        collected=merge_catalog(old,rows,{'lotte':state},now.isoformat())
        for attempt in range(3):
            git('fetch','origin','main')
            parent=git('rev-parse','origin/main')
            latest=json.loads(git('show',parent+':'+DATA))
            result=merge(latest,collected)
            payload=(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8')
            blob=git('hash-object','-w','--stdin',data=payload)
            with tempfile.TemporaryDirectory(prefix='marketbot-lotte-') as scratch:
                env={**os.environ,'GIT_INDEX_FILE':str(Path(scratch)/'index')}
                git('read-tree',parent,env=env)
                git('update-index','--add','--cacheinfo','100644',blob,DATA,env=env)
                tree=git('write-tree',env=env)
            commit=git('-c','user.name=MarketBot','-c','user.email=marketbot@users.noreply.github.com','commit-tree',tree,'-p',parent,data=b'Refresh verified Lotte store observations\n')
            pushed=subprocess.run(['git','push','origin',commit+':main'],cwd=ROOT,capture_output=True)
            if pushed.returncode==0:
                print(json.dumps({'status':'published','count':state['count'],'commit':commit,'checkedAt':now.isoformat()}));return
        raise SystemExit('Publication conflicted three times; no force push performed')
    finally:
        os.close(handle);lock.unlink()

if __name__=='__main__':main()
