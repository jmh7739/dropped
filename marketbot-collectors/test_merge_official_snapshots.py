import json
import tempfile
import unittest
from pathlib import Path
from merge_official_snapshots import merge


class MergeOfficialTests(unittest.TestCase):
    def test_preserves_newer_remote_and_unrelated_files(self):
        with tempfile.TemporaryDirectory() as folder:
            source, target = Path(folder) / 'source', Path(folder) / 'target'
            source.mkdir(); target.mkdir()
            (source / 'checked-at.json').write_text(json.dumps({'seoul-culture.xml': '2026-11-03T07:00:00Z', 'qnet-1150.html': '2026-11-03T08:00:00Z'}))
            (target / 'checked-at.json').write_text(json.dumps({'seoul-culture.xml': '2026-11-03T09:00:00Z', 'qnet-1150.html': '2026-11-03T06:00:00Z', 'other': 'keep'}))
            (source / 'seoul-culture.xml').write_bytes(b'older')
            (target / 'seoul-culture.xml').write_bytes(b'newer')
            (source / 'qnet-1150.html').write_bytes(b'fresh exam')
            (target / 'public-feed.json').write_bytes(b'unrelated')
            self.assertEqual(merge(source, target), 1)
            self.assertEqual((target / 'seoul-culture.xml').read_bytes(), b'newer')
            self.assertEqual((target / 'qnet-1150.html').read_bytes(), b'fresh exam')
            self.assertEqual((target / 'public-feed.json').read_bytes(), b'unrelated')
            self.assertEqual(json.loads((target / 'checked-at.json').read_text())['other'], 'keep')
            self.assertEqual(merge(source, target), 0)

    def test_missing_file_or_invalid_timestamp_cannot_advance_verification(self):
        with tempfile.TemporaryDirectory() as folder:
            source, target = Path(folder) / 'source', Path(folder) / 'target'
            source.mkdir(); target.mkdir()
            (source / 'checked-at.json').write_text(json.dumps({'seoul-culture.xml': '2026-11-03T07:00:00Z', 'qnet-1150.html': 'invalid'}))
            (source / 'qnet-1150.html').write_bytes(b'unverified')
            self.assertEqual(merge(source, target), 0)
            self.assertFalse((target / 'checked-at.json').exists())


if __name__ == '__main__':
    unittest.main()
