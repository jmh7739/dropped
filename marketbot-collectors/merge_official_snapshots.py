"""Merge only owned official snapshots, keeping each source's newest observation."""
import json
import sys
from datetime import datetime
from pathlib import Path
from collect_official import SOURCES


def stamp(value):
    try:
        parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return parsed.timestamp() if parsed.tzinfo else float('-inf')
    except (ValueError, TypeError):
        return float('-inf')


def merge(source, target):
    source, target = Path(source), Path(target)
    incoming = json.loads((source / 'checked-at.json').read_text(encoding='utf-8'))
    manifest = target / 'checked-at.json'
    current = json.loads(manifest.read_text(encoding='utf-8')) if manifest.exists() else {}
    changed = 0
    for name in SOURCES:
        candidate = source / name
        if candidate.is_file() and stamp(incoming.get(name)) > stamp(current.get(name)):
            target.mkdir(parents=True, exist_ok=True)
            (target / name).write_bytes(candidate.read_bytes())
            current[name] = incoming[name]
            changed += 1
    if changed:
        manifest.write_text(json.dumps(current, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return changed


if __name__ == '__main__':
    print('Merged official sources:', merge(*sys.argv[1:]))
