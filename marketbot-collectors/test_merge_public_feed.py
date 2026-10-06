import unittest

from merge_public_feed import merge


class MergePublicFeedTest(unittest.TestCase):
    def test_keeps_newest_group_and_collection_metadata(self):
        current = {
            'exams': {'checkedAt': '2026-10-07T01:00:00+00:00', 'items': ['new']},
            'ott': {'checkedAt': '2026-10-06T20:00:00+00:00', 'items': ['old']},
            '_collection': {'checkedAt': '2026-10-07T01:00:00+00:00', 'status': 'complete'},
        }
        collected = {
            'exams': {'checkedAt': '2026-10-06T23:00:00+00:00', 'items': ['old']},
            'ott': {'checkedAt': '2026-10-07T02:00:00+00:00', 'items': ['new']},
            '_collection': {'checkedAt': '2026-10-06T23:00:00+00:00', 'status': 'partial'},
        }
        result = merge(current, collected)
        self.assertEqual(result['exams']['items'], ['new'])
        self.assertEqual(result['ott']['items'], ['new'])
        self.assertEqual(result['_collection']['status'], 'complete')


if __name__ == '__main__':
    unittest.main()
