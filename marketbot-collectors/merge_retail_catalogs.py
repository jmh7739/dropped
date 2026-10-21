"""Merge only real observations when another job updated the shared branch."""
import json
import sys
from datetime import datetime
from pathlib import Path

def stamp(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()

def merge(left, right):
    offers = {}
    for catalog in (left, right):
        for row in catalog.get('offers', []):
            old = offers.get(row['id'])
            if not old:
                offers[row['id']] = row
                continue
            latest = max((old, row), key=lambda r: stamp(r['lastSeenAt']))
            history = {}
            for observation in old['history'] + row['history']:
                key = (observation['checkedAt'][:10], observation['revision'])
                if key not in history or stamp(observation['checkedAt']) > stamp(history[key]['checkedAt']):
                    history[key] = observation
            offers[row['id']] = {**latest, 'firstSeenAt': min((old['firstSeenAt'], row['firstSeenAt']), key=stamp),
                'history': sorted(history.values(), key=lambda h: stamp(h['checkedAt']))[-180:]}
    sources = {}
    for catalog in (left, right):
        for key, value in catalog.get('sources', {}).items():
            time = value.get('attemptedAt') or value.get('checkedAt')
            previous = sources.get(key, {})
            if key not in sources or stamp(time) > stamp(previous.get('attemptedAt') or previous.get('checkedAt')):
                sources[key] = value
    return {'schemaVersion': 1, 'checkedAt': max((left['checkedAt'],right['checkedAt']),key=stamp),
            'sources': sources, 'offers': sorted(offers.values(),key=lambda o:o['id'])}

if __name__ == '__main__':
    collected, destination = map(Path, sys.argv[1:3])
    result = merge(json.loads(destination.read_text(encoding='utf-8')), json.loads(collected.read_text(encoding='utf-8')))
    destination.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
