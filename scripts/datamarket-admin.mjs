// Read-only audit and local recovery copies. No database writes or retention deletion.
// Public price backup: node --env-file=.env.local scripts/datamarket-admin.mjs backup
// Credentials are read from the process environment, never printed or written to disk.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Database environment required');
const db = createClient(url, key, {auth:{persistSession:false,autoRefreshToken:false}});
const mode = process.argv[2] ?? 'audit';
const hash = value => createHash('sha256').update(value).digest('hex');
const unwrap = result => { if(result.error) throw new Error(`${result.error.code}: ${result.error.message}`); return result.data; };
async function count(table, since) {
 let q=db.from(table).select('*',{count:'exact',head:true});
 if(since) q=q.gte('collected_at',since);
 const r=await q; unwrap(r); return r.count;
}
async function audit() {
 const out={at:new Date().toISOString(),read_scope:process.env.SUPABASE_SERVICE_ROLE_KEY?'admin':'public',tables:{}};
 for(const table of ['products','price_history','flight_price_history','hot_deals']) {
  if(table==='flight_price_history' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
   out.tables[table]={status:'requires service-role read access; not an empty table'}; continue;
  }
  out.tables[table]={rows:await count(table)};
  if(table.endsWith('price_history')) {
   const day=await count(table,new Date(Date.now()-86400000).toISOString());
   const week=await count(table,new Date(Date.now()-7*86400000).toISOString());
   Object.assign(out.tables[table],{last_day:day,last_7_days:week,
    projected_annual_rows:Math.round(week/7*365),projection_basis:'last 7 days; not a byte measurement'});
  }
 }
 console.log(JSON.stringify(out,null,2));
}
async function readSnapshot(table, columns, boundary) {
 const rows=[]; let cursor=0;
 while(true) {
  const page=unwrap(await db.from(table).select(columns).gt('id',cursor).lte('id',boundary)
    .order('id').limit(1000));
  rows.push(...page); if(page.length<1000) break; cursor=page.at(-1).id;
 }
 return rows;
}
if(mode==='audit') await audit();
else if(mode==='backup') {
 const folder=path.resolve('.audit-backups'); await fs.mkdir(folder,{recursive:true});
 const tables = process.env.SUPABASE_SERVICE_ROLE_KEY ? ['price_history','flight_price_history'] : ['price_history'];
 for(const table of tables) {
  const upper=unwrap(await db.from(table).select('id').order('id',{ascending:false}).limit(1))[0]?.id??0;
  const columns=table==='price_history'?'id,product_id,price,collected_at':'id,external_id,price,collected_at';
  const rows=await readSnapshot(table,columns,upper);
  const raw=JSON.stringify({table,upper,columns,created_at:new Date().toISOString(),rows});
  const target=path.join(folder,`${table}-${Date.now()}.json.gz`);
  await fs.writeFile(target,gzipSync(raw));
  const roundTrip=gunzipSync(await fs.readFile(target)).toString();
  if(hash(roundTrip)!==hash(raw)) throw new Error('Backup checksum mismatch');
  console.log(JSON.stringify({file:target,rows:rows.length,sha256:hash(raw),upper}));
 }
} else if(mode==='verify-backup') {
 const original=JSON.parse(gunzipSync(await fs.readFile(process.argv[3])).toString());
 const current=await readSnapshot(original.table,original.columns,original.upper);
 if(hash(JSON.stringify(current))!==hash(JSON.stringify(original.rows))) throw new Error('Historical rows changed');
 console.log(`PASS: ${original.table} ${current.length} original rows match backup exactly`);
} else throw new Error('Unknown mode; use audit, backup, verify-backup');
