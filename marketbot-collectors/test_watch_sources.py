import unittest

from watch_sources import content_for, content_version


class OfficialArticleExtractionTests(unittest.TestCase):
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
