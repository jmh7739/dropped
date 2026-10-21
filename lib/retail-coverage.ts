import type {RetailCatalog} from './retail';
export function coverageNote(catalog:RetailCatalog,id:string){
 const source=catalog.sources[id];
 if(id==='gs25')return 'GS25 행사 상품의 가격 목록은 아직 연결되지 않았습니다. 공식 공개 화면에서 확인되지 않은 가격을 대신 채우지 않습니다.';
 if(id==='costco')return '코스트코 상품 가격 연동은 제공하지 않습니다. 온라인몰·매장 행사와 회원 조건은 공식 안내에서 확인하세요.';
 if(id==='nobrand')return '현재 목록은 공식 출시 발표에서 확인한 참고가격입니다. 노브랜드 오프라인 할인 전단 전체와 SSG 온라인 할인 상품은 아직 연결되지 않았습니다.';
 if(id==='traders')return '현재는 공식 출시 발표의 참고가격 일부입니다. 트레이더스 점포별 할인 상품 전체를 수집한 목록이 아닙니다.';
 if(id==='emart')return '공식 행사 발표에서 가격·기간·결제 조건을 확인한 일부 품목입니다. 이마트 앱·점포별 전단 전체 목록은 아닙니다.';
 if(id==='lotte')return '제타플렉스 서울역점에서 확인한 일부 묶음 상품의 참고가격입니다. 전국 롯데마트 할인 상품 전체 목록이 아닙니다.';
 if(id==='homeplus')return source?.status==='source_preparing'?'공식 디지털 전단이 상품 준비 중으로 응답하고 있습니다. 이전 확인 기록은 남기되 현재 할인 상품으로 갱신하지 않습니다.':'공식 디지털 전단에서 목록·상세가 일치한 품목입니다. 방문 점포의 전체 행사·재고를 보장하지 않습니다.';
 if(id==='cu'){
  if(source?.paginationComplete===true){const found=source.discovered??source.count??0,verified=source.count??0;return `공식 1+1·2+1 목록의 마지막 페이지까지 확인했습니다. 확인 후보 ${found}종 중 목록·상세 대조 ${verified}종${source.notConfirmed?` · 미확인 ${source.notConfirmed}종 보류`:''}. 일반 할인·앱 전용·점포별 행사는 포함하지 않습니다.`;}
  return '공식 1+1·2+1 목록의 일부 확인 기록입니다. 수집이 끝나거나 보류 품목의 확인이 완료되기 전에는 전체 목록으로 표시하지 않습니다.';
 }
 return '브랜드별 확인 범위가 다릅니다. 상품 수를 매장의 전체 행사 수로 보지 마세요.';
}
