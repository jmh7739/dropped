import unittest
from unittest.mock import patch
from collect_retail_promotions import PublicReader, parse_cu_list, confirm_cu, parse_lotte, merge_catalog

CARD='''<li class="prod_list"><a href="javascript:view(270);"><div class="name"><p>농심)캔디50g</p></div><div class="price"><strong>900</strong></div><!-- plus2 example --><span class="plus1">1+1</span><img src="/product/6921211104292.jpg"></a></li>'''
DETAIL='''<p class="tit">농심)캔디50g</p><ul class="prodTag"><li>1+1</li></ul><dd class="prodPrice"><p><span>900</span>원</p></dd>'''

class RetailTests(unittest.TestCase):
    def test_list_and_detail_must_match_and_dates_are_not_guessed(self):
        row=parse_cu_list(CARD)[0]
        self.assertEqual(row['buyQuantity'],1)
        self.assertEqual(row['unitPrice'],900)
        self.assertIsNone(row['endDate'])
        self.assertTrue(confirm_cu(row,DETAIL))
        self.assertFalse(confirm_cu(row,DETAIL.replace('900','1000')))
        self.assertFalse(confirm_cu(row,DETAIL.replace('1+1','2+1')))

    def test_lotte_keeps_real_period_and_rejects_prize_announcements(self):
        block='''<a href='./event_view.asp?event_banner_id=123'><div class="tit">261015_1028_PB페스타_장바구니 결제 이벤트</div><div class="period">2026-10-15 00:00 ~ 2026-10-28 23:59</div></a>'''
        row=parse_lotte(block)[0]
        self.assertEqual(row['name'],'PB페스타 장바구니 결제 이벤트')
        self.assertEqual(row['startDate'],'2026-10-15')
        self.assertEqual(row['endDate'],'2026-10-28')
        self.assertIsNone(row['unitPrice'])
        self.assertEqual(parse_lotte(block.replace('PB페스타_장바구니 결제 이벤트','당첨자발표')),[])

    def test_history_preserves_changes_but_not_duplicate_same_day_runs(self):
        row=parse_cu_list(CARD)[0]
        first=merge_catalog({},[row],{},'2026-10-21T01:00:00Z')
        second=merge_catalog(first,[row],{},'2026-10-21T07:00:00Z')
        self.assertEqual(len(second['offers'][0]['history']),1)
        changed=merge_catalog(second,[{**row,'unitPrice':1000}],{},'2026-10-21T08:00:00Z')
        self.assertEqual(len(changed['offers'][0]['history']),2)
        self.assertEqual(changed['offers'][0]['history'][0]['unitPrice'],900)
        absent=merge_catalog(changed,[],{},'2026-10-22T08:00:00Z')
        self.assertEqual(absent['offers'][0]['lastSeenAt'],'2026-10-21T08:00:00Z')

    def test_policy_denial_and_malformed_policy_are_not_bypassed(self):
        reader=PublicReader()
        with patch.object(reader,'raw',return_value='User-agent: *\nDisallow: /') as raw:
            with self.assertRaises(ValueError): reader.get('https://cu.bgfretail.com/event/plusAjax.do')
            self.assertEqual(raw.call_count,1)
        reader=PublicReader()
        with patch.object(reader,'raw',return_value='<html>not robots</html>'):
            with self.assertRaises(ValueError): reader.get('https://cu.bgfretail.com/event/plusAjax.do')

if __name__=='__main__': unittest.main()
