"""Merge a just-collected public feed with the latest remote snapshot.

Each API group keeps its newest checkedAt value. This prevents a concurrent
workflow push from losing verified data when this job retries publication.
"""

from datetime import datetime
from pathlib import Path
import json
import sys


def timestamp(value):
    if not isinstance(value, dict):
        return datetime.min.isoformat()
    return str(value.get('checkedAt') or '')


def merge(current, collected):
    result = dict(current)
    for key, value in collected.items():
        if key not in result or timestamp(value) > timestamp(result[key]):
            result[key] = value
    return result


def main(collected_path, current_path):
    collected = json.loads(Path(collected_path).read_text(encoding='utf-8'))
    current_file = Path(current_path)
    current = json.loads(current_file.read_text(encoding='utf-8')) if current_file.exists() else {}
    current_file.parent.mkdir(parents=True, exist_ok=True)
    current_file.write_text(json.dumps(merge(current, collected), ensure_ascii=False,
                                       separators=(',', ':')) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
