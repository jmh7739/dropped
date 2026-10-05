"""Regression checks for public API pagination and company matching."""

import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    'collect_public_data', Path(__file__).with_name('collect_public_data.py'))
collector = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(collector)


class PublicDataTests(unittest.TestCase):
    def test_exam_schedule_reads_second_page(self):
        year = collector.datetime.now(collector.KST).year
        calls = []

        def fake_request(path, params, key_name='serviceKey'):
            calls.append((int(params['implYy']), int(params['pageNo'])))
            rows = ([{'implYy': str(year), 'implSeq': str(n)} for n in range(50)]
                    if params['implYy'] == str(year) and params['pageNo'] == '1' else
                    [{'implYy': str(year), 'implSeq': '50'}]
                    if params['implYy'] == str(year) and params['pageNo'] == '2' else [])
            return json.dumps({'response': {'header': {'resultCode': '00'},
                'body': {'items': {'item': rows}}}}).encode()

        with patch.object(collector, 'request', side_effect=fake_request):
            result = collector.exams()
        self.assertEqual(len(result), 51)
        self.assertIn((year, 2), calls)
        self.assertIn((year + 1, 1), calls)

    def test_company_matches_exact_name_and_deduplicates_versions(self):
        def fake_request(path, params, key_name='serviceKey'):
            name = params['corpNm']
            rows = ([{'corpNm': '(주)카카오', 'crno': '123', 'fssCorpChgDtm': '20260101'},
                     {'corpNm': '카카오', 'crno': '123', 'fssCorpChgDtm': '20261001'},
                     {'corpNm': '카카오뱅크', 'crno': '456'}] if name == '카카오' else [])
            return json.dumps({'response': {'header': {'resultCode': '00'},
                'body': {'items': {'item': rows}}}}).encode()

        with patch.object(collector, 'request', side_effect=fake_request):
            result = collector.companies()
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['fssCorpChgDtm'], '20261001')

    def test_tourism_preserves_source_kind(self):
        def fake_request(path, params, key_name='serviceKey'):
            row = {'contentid': '123', 'title': '공식 행사', 'eventstartdate': '20261005'}
            return json.dumps({'response': {'header': {'resultCode': '0000'},
                'body': {'items': {'item': [row]}}}}).encode()

        with patch.object(collector, 'request', side_effect=fake_request):
            result = collector.tourism()
        self.assertEqual([row['kind'] for row in result],
                         ['travel_event', 'travel_place', 'travel_place'])
        self.assertEqual(result[0]['contentid'], '123')

    def test_disclosures_exclude_old_reference_dates(self):
        recent = collector.datetime.now(collector.KST).strftime('%Y%m%d')
        def fake_request(path, params, key_name='serviceKey'):
            self.assertEqual(params['numOfRows'], '100')
            rows = [{'crno': '123', 'basDt': '20151001', 'crtmCashTdvdAmt': '100'},
                    {'crno': '123', 'basDt': recent, 'crtmCashTdvdAmt': '200'}]
            return json.dumps({'response': {'header': {'resultCode': '00'},
                'body': {'items': {'item': rows}}}}).encode()
        with patch.object(collector, 'request', side_effect=fake_request):
            result = collector.disclosures([{'crno': '123'}])
        self.assertEqual([row['basDt'] for row in result], [recent])


if __name__ == '__main__':
    unittest.main()
