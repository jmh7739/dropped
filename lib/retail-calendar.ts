import {type RetailOffer,kstDay} from './retail';
export function calendarOffers(offers:RetailOffer[],day:string,brand=''){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T00:00:00Z'))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)return [];
 return offers.filter(o=>o.priceKind!=='reference'&&!!o.startDate&&!!o.endDate&&o.startDate<=day&&o.endDate>=day&&(!brand||o.retailer===brand));
}
export const calendarDays=(start:string)=>Array.from({length:7},(_,i)=>kstDay(Date.parse(start+'T00:00:00+09:00')+i*86400000));
