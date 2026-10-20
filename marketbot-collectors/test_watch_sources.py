import unittest
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import watch_sources
from http.client import RemoteDisconnected
from urllib.error import HTTPError
from types import SimpleNamespace

from watch_sources import content_for, content_version


class TransientRetryTests(unittest.TestCase):
    def test_remote_disconnect_gets_one_same_url_retry(self):
        url = 'https://official.example/guide'
        with patch.object(watch_sources, 'urlopen', side_effect=RemoteDisconnected()), \
             patch.object(watch_sources.subprocess, 'run', return_value=SimpleNamespace(stdout=b'official')) as retry:
            self.assertEqual(watch_sources.get(url), b'official')
            retry.assert_called_once()
            self.assertEqual(retry.call_args.args[0][-1], url)
            self.assertNotIn('--insecure', retry.call_args.args[0])

    def test_http_denial_is_not_retried(self):
        url = 'https://official.example/guide'
        with patch.object(watch_sources, 'urlopen', side_effect=HTTPError(url,403,'denied',{},None)), \
             patch.object(watch_sources.subprocess, 'run') as retry:
            with self.assertRaises(HTTPError):
                watch_sources.get(url)
            retry.assert_not_called()


class BoundedPolicyChecksTests(unittest.TestCase):
    def run_sample(self, denied=False):
        sources = [{'id': 'housing-benefit' if i == 0 else f'source-{i}',
                    'url': f'https://official-{i}.example/guide',
                    'primaryUrl': f'https://primary-{i}.example/',
                    'monitorScope': '선정 소득기준만 감시'} for i in range(44)]
        requests = []
        def get(url, **kwargs):
            requests.append(url)
            if url.endswith('/api/marketbot/sources'):
                return json.dumps({'sources': sources}).encode()
            if url.endswith('/robots.txt'):
                if denied and url.startswith('https://official-0.'):
                    return b'User-agent: *\nDisallow: /\n'
                return b'User-agent: *\nAllow: /\n'
            return ('<main>' + '공식 안내 본문 ' * 50 + '</main>').encode()
        with TemporaryDirectory() as directory, patch.object(watch_sources, 'OUT', Path(directory)/'digests.json'), \
             patch.object(watch_sources, 'BASE', {'LifeMarket': 'https://life.example'}), \
             patch.object(watch_sources, 'get', side_effect=get), patch.object(watch_sources.time, 'sleep'):
            watch_sources.main()
            result = json.loads(watch_sources.OUT.read_text(encoding='utf-8'))
        return requests, result

    def test_only_selected_sources_receive_policy_and_page_requests(self):
        requests, result = self.run_sample()
        self.assertEqual(len([url for url in requests if url.endswith('/robots.txt')]), 12)
        self.assertEqual(len(requests), 25)  # manifest + 12 policies + 12 pages
        selection = result['selection']['LifeMarket']
        self.assertEqual(selection['knownSourceCount'], 44)
        self.assertEqual(selection['policyCheckedCount'], 12)
        self.assertEqual(selection['robotsExcluded'], 0)
        self.assertEqual(selection['scope'], 'selected-sample-only')
        self.assertEqual(result['LifeMarket:housing-benefit']['monitorScope'], '선정 소득기준만 감시')

    def test_policy_denial_is_never_fetched_or_published(self):
        requests, result = self.run_sample(denied=True)
        self.assertNotIn('https://official-0.example/guide', requests)
        self.assertNotIn('LifeMarket:housing-benefit', result)
        self.assertEqual(result['selection']['LifeMarket']['robotsExcluded'], 1)


class OfficialArticleExtractionTests(unittest.TestCase):
    def test_fsc_document_ignores_view_counter_but_keeps_policy_and_attachments(self):
        url = 'https://www.fsc.go.kr/po010102/83833'
        html = ('<nav>인기 소식 1</nav><div class="board-view-wrap">'
                '<div class="header"><div class="subject">중도상환수수료 안내</div>'
                '<div class="day">2025-01-09 조회수 123</div></div>'
                '<div class="body"><div class="cont"><p>신규 계약부터 적용합니다.</p></div>'
                '<div class="file">공식자료.pdf</div></div></div>')
        self.assertEqual(content_for(url, html), content_for(url, html.replace('조회수 123', '조회수 124').replace('인기 소식 1', '인기 소식 2')))
        self.assertNotEqual(content_for(url, html), content_for(url, html.replace('신규 계약', '갱신 계약')))
        self.assertNotEqual(content_for(url, html), content_for(url, html.replace('공식자료.pdf', '정정자료.pdf')))
        self.assertEqual(content_version(url), 'fsc-article-v1')
        with self.assertRaises(ValueError):
            content_for(url, '<div class="board-view-wrap"><div class="subject">안내</div></div>')

    def test_hug_guarantee_ignores_navigation_but_detects_contact_change(self):
        url = 'https://www.khug.or.kr/hug/web/ig/dr/igdr000004.jsp?tabMenu=Y'
        facts = (
            '<div class="goodsInfo01">' + '전세보증금 반환보증 신청 안내 ' * 8 + '</div>'
            + '<div class="termsTable">' + '보증 약관과 가입 조건을 확인하세요. ' * 8 + '</div>'
            + '<div class="contentArea" id="link__guide">상담 연락처 1566-9009</div>'
        )
        first = '<header>새 소식 1</header>' + facts + '<footer>조회 10</footer>'
        second = '<header>새 소식 2</header>' + facts + '<footer>조회 11</footer>'
        self.assertEqual(content_for(url, first), content_for(url, second))
        self.assertNotEqual(content_for(url, first), content_for(url, second.replace('1566-9009', '1566-9010')))
        self.assertEqual(content_version(url), 'deposit-guide-v1')
        with self.assertRaises(ValueError):
            content_for(url, '<header>전체 메뉴만 읽혔습니다.</header>')


if __name__ == '__main__':
    unittest.main()
