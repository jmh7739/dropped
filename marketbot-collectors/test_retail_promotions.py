import unittest
from unittest.mock import patch
from collect_retail_promotions import PublicReader, parse_cu_list, confirm_cu, parse_lotte, merge_catalog, parse_homeplus, confirm_homeplus
from urllib.error import HTTPError

CARD='''<li class="prod_list"><a href="javascript:view(270);"><div class="name"><p>농심)캔디50g</p></div><div class="price"><strong>900</strong></div><!-- plus2 example --><span class="plus1">1+1</span><img src="/product/6921211104292.jpg"></a></li>'''
DETAIL='''<p class="tit">농심)캔디50g</p><ul class="prodTag"><li>1+1</li></ul><dd class="prodPrice"><p><span>900</span>원</p></dd>'''

class RetailTests(unittest.TestCase):
    def test_homeplus_numeric_price_and_detail_dates_must_match(self):
        item={'goodsId':2756,'goodsNm':'행복대란 30개입','price':'5,520','origPrice':'7,890','tags':[{'tagNm':'멤버특가 30% 할인'}],'startTime':'20261015 00:00:00','endTime':'20261021 23:59:59'}
        row=parse_homeplus({'data':{'goodsList':[item]}})[0]
        detail='<h2 class="prd__name">행복대란 30개입</h2><span>멤버특가</span><span class="prd__discount"><strong>5,520</strong>원</span><div class="prd__promotion-date"><span>10. 15.(목) ~ 10. 21.(수)</span></div>'
        self.assertTrue(confirm_homeplus(row,detail))
        self.assertFalse(confirm_homeplus(row,detail.replace('5,520','5,530')))
        self.assertFalse(confirm_homeplus(row,detail.replace('10. 21.','10. 22.')))
        self.assertEqual(row['giftQuantity'],0)
        self.assertNotIn('listPrice',row) # Printed reference prices are not observed history.
        self.assertEqual(parse_homeplus({'data':{'goodsList':[{**item,'endTime':'20260230 00:00:00'}]}}),[])

    def test_missing_robots_is_not_a_content_access_bypass(self):
        reader=PublicReader()
        with patch.object(reader,'raw',side_effect=[HTTPError('https://my.homeplus.co.kr/robots.txt',400,'Bad request',{},None),'public page']):
            self.assertEqual(reader.get('https://my.homeplus.co.kr/leaflet'),'public page')
        for status in (401,403,407,429,503):
            reader=PublicReader()
            with patch.object(reader,'raw',side_effect=HTTPError('https://my.homeplus.co.kr/robots.txt',status,'denied',{},None)):
                with self.assertRaises(HTTPError): reader.get('https://my.homeplus.co.kr/leaflet')

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
