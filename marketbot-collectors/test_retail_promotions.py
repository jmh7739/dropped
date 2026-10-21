import unittest
from unittest.mock import patch
from collect_retail_promotions import PublicReader, parse_cu_list, confirm_cu, parse_lotte, merge_catalog, parse_homeplus, confirm_homeplus
from urllib.error import HTTPError
from merge_retail_catalogs import merge
from collect_more_retail import parse_press, parse_lotte_lookup, RULES
from collect_retail_promotions import text, revision, product_image
import json

CARD='''<li class="prod_list"><a href="javascript:view(270);"><div class="name"><p>농심)캔디50g</p></div><div class="price"><strong>900</strong></div><!-- plus2 example --><span class="plus1">1+1</span><img src="/product/6921211104292.jpg"></a></li>'''
DETAIL='''<p class="tit">농심)캔디50g</p><ul class="prodTag"><li>1+1</li></ul><dd class="prodPrice"><p><span>900</span>원</p></dd>'''

class RetailTests(unittest.TestCase):
    def test_product_images_are_observed_https_urls_not_guessed_paths(self):
        url='//tqklhszfkvzk6518638.edge.naverncp.com/product/8801234567890_1.png'
        self.assertEqual(product_image(url,'cu'),'https:'+url)
        self.assertIsNone(product_image('https://example.com/product/8801234567890.jpg','cu'))
        self.assertIsNone(product_image('javascript:alert(1)','homeplus'))
        self.assertEqual(product_image('https://image.homeplus.kr/it/127502198s0300','homeplus'),'https://image.homeplus.kr/it/127502198s0300')
        row=parse_cu_list(CARD)[0]
        self.assertEqual(revision(row),revision({**row,'imageUrl':'https:'+url}),'image-only changes are not price changes')
    def test_press_prices_require_exact_evidence_and_date(self):
        rule=json.loads(RULES.read_text(encoding='utf-8'))[-1]
        evidence=' '.join(rule.get('periodEvidence',[]) + rule['items'][0]['evidence'])
        html=rule['publishedDate']+'<p>'+evidence+'</p>'
        row=parse_press(html,rule,text)[0]
        self.assertEqual(row['priceKind'],'reference')
        self.assertIsNone(row['startDate'])
        self.assertIsNone(row['endDate'])
        self.assertEqual(parse_press(html.replace(rule['publishedDate'],'2000-01-01'),rule,text),[])
        self.assertEqual(parse_press(html.replace(rule['items'][0]['evidence'][-1],'MISSING'),rule,text),[])
    def test_lotte_requires_explicit_pack_and_matching_popup(self):
        html='<li><div class="prod-box"><div class="prod-name">테스트 우유</div><div class="prod-count"><!--8801234567890-->200ML*3</div><div class="layer-head">테스트 우유</div><th>ㆍ가격 : </th><td>3,000 원</td></div></li>'
        row=parse_lotte_lookup(html,text,'우유')[0]
        self.assertIn('서울역점',row['scope'])
        self.assertEqual(row['priceKind'],'reference')
        self.assertEqual(parse_lotte_lookup(html.replace('200ML*3','240ML'),text,'우유'),[])
        self.assertEqual(parse_lotte_lookup(html.replace('class="layer-head">테스트 우유','class="layer-head">다른 우유'),text,'우유'),[])
    def test_policy_redirect_unknown_html_still_stops_collection(self):
        reader=PublicReader()
        redirect=HTTPError('https://company.lottemart.com/robots.txt',302,'redirect',{'Location':'/err/404.asp'},None)
        with patch.object(reader,'raw',side_effect=[redirect,'<html>missing file</html>']) as raw:
            with self.assertRaises(ValueError):reader.get('https://company.lottemart.com/mobiledowa/')
            self.assertEqual(raw.call_count,2)
        reader=PublicReader()
        with patch.object(reader,'raw',side_effect=HTTPError('https://company.lottemart.com/robots.txt',302,'redirect',{'Location':'https://example.com/robots.txt'},None)) as raw:
            with self.assertRaises(HTTPError):reader.get('https://company.lottemart.com/mobiledowa/')
            self.assertEqual(raw.call_count,1)
    def test_concurrent_snapshots_keep_newer_observations_and_new_brands(self):
        row=parse_cu_list(CARD)[0]
        left=merge_catalog({},[row],{},'2026-10-21T01:00:00Z')
        right=merge_catalog(left,[{**row,'unitPrice':1000}],{},'2026-10-21T07:00:00Z')
        other={**row,'id':'cu-271','sourceId':'271'}
        left=merge_catalog(left,[other],{},'2026-10-21T02:00:00Z')
        combined=merge(right,left)
        self.assertEqual(len(combined['offers']),2)
        self.assertEqual(combined['offers'][0]['unitPrice'],1000)
        self.assertEqual(len(combined['offers'][0]['history']),2)
        self.assertEqual(combined['offers'][0]['firstSeenAt'],'2026-10-21T01:00:00Z')
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
