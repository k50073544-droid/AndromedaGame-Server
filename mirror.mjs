/* Зеркало картинок TheAndrameda Universe: копирует картинки из хранилища Supabase в папку st/.
   Запускается GitHub Action-ом .github/workflows/mirror-images.yml раз в ~10 минут. Сайт (sw.js) берёт картинки из st/. */
import fs from 'node:fs/promises';
import path from 'node:path';
const BASE = process.env.SB_URL || 'https://gwrrvfrgovmcwpeogdio.supabase.co';
const KEY = 'sb_publishable_I-TykQozBNyzkiMeP3g1lw_v_AwGOz4';
const DIR = 'st';
const H = { apikey: KEY, 'Content-Type': 'application/json' };
const RX = /https:\/\/gwrrvfrgovmcwpeogdio\.supabase\.co\/storage\/v1\/object\/public\/([A-Za-z0-9._\-\/]+\.(?:webp|png|jpe?g|gif|svg|avif))/gi;
const SRC = [
  ['GET', '/rest/v1/planets?select=image_url'],
  ['GET', '/rest/v1/decorations?select=image_url'],
  ['GET', '/rest/v1/profiles?select=avatar_url'],
  ['GET', '/rest/v1/games?select=id,thumbnail_url&status=eq.approved'],
  ['GET', '/rest/v1/news_posts?select=*&order=created_at.desc&limit=100'],
  ['GET', '/rest/v1/news_emojis?select=*'],
  ['GET', '/rest/v1/site_settings?select=*'],
  ['GET', '/rest/v1/achievements?select=*'],
  ['POST', '/rest/v1/rpc/shop_today']
];
const want = new Set();
let allOk = true;
for (const [m, u] of SRC) {
  try {
    const r = await fetch(BASE + u, { method: m, headers: H, body: m === 'POST' ? '{}' : undefined });
    if (!r.ok) { console.log('пропуск', u, r.status); if (!/news_emojis|achievements|shop_today/.test(u)) allOk = false; continue; }
    const t = await r.text();
    for (const x of t.matchAll(RX)) want.add(x[1]);
  } catch (e) { console.log('ошибка', u, e.message); allOk = false; }
}
console.log('картинок в базе:', want.size);
const have = new Set();
async function walk(d) { let es = []; try { es = await fs.readdir(d, { withFileTypes: true }); } catch (e) { return; }
  for (const e of es) { const f = path.join(d, e.name); if (e.isDirectory()) await walk(f); else have.add(path.relative(DIR, f).split(path.sep).join('/')); } }
await walk(DIR);
let added = 0, bytes = 0, removed = 0;
for (const p of want) {
  if (have.has(p) || p.includes('..')) continue;
  if (bytes > 200 * 1048576) break;
  try {
    const r = await fetch(BASE + '/storage/v1/object/public/' + p);
    const ct = r.headers.get('content-type') || '';
    if (!r.ok || !/^image\//i.test(ct)) { console.log('не скачалось', p, r.status, ct); continue; }
    const b = Buffer.from(await r.arrayBuffer());
    if (b.length > 15 * 1048576) { console.log('слишком большая', p); continue; }
    await fs.mkdir(path.dirname(path.join(DIR, p)), { recursive: true });
    await fs.writeFile(path.join(DIR, p), b); added++; bytes += b.length;
  } catch (e) { console.log('ошибка', p, e.message); }
}
if (allOk && want.size > 0) {
  for (const p of have) { if (!want.has(p) && p !== '.keep') { await fs.unlink(path.join(DIR, p)).catch(() => {}); removed++; } }
}
console.log('добавлено:', added, '(' + Math.round(bytes / 1024) + ' КБ), удалено старых:', removed);
