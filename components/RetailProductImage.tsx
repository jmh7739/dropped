'use client';

import { useEffect, useRef, useState } from 'react';
import { retailer, retailImageUrl, type RetailOffer } from '@/lib/retail';

export default function RetailProductImage({ offer, detail = false }: { offer: RetailOffer; detail?: boolean }) {
  const url = retailImageUrl(offer);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // A cached/early failure may happen before React attaches onError.
    if (url && image.current?.complete && image.current.naturalWidth === 0) setFailedUrl(url);
  }, [url]);
  const visible = url && failedUrl !== url;
  return <figure className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
    <div className={'flex items-center justify-center bg-white p-4 ' + (detail ? 'h-72 sm:h-80' : 'h-44')}>
      {visible ? <img ref={image} src={url} alt={`${offer.name} 상품 사진`} width={320} height={320} loading={detail ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} className="h-full max-h-full w-full object-contain" />
        : <p role="status" className="px-4 text-center text-sm leading-6 text-gray-500">{failedUrl ? '상품 사진을 불러오지 못했습니다.' : '확인된 개별 상품 사진이 없습니다.'}<br /><span className="text-xs">상품명·규격·가격 조건을 확인해 주세요.</span></p>}
    </div>
    {visible && <figcaption className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500">상품 사진: <a href={offer.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{retailer(offer.retailer).name} 공식 상품 안내</a> · 포장 디자인은 달라질 수 있습니다.</figcaption>}
  </figure>;
}
