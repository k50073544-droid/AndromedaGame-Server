/* TheAndrameda Universe — картинки из зеркала.
   Картинки планет, декораций, аватарок и иконок игр копируются из хранилища Supabase в папку st/ этого репозитория
   (это делает GitHub Action «Зеркало картинок» раз в ~10 минут). Этот файл подменяет загрузку: сначала берёт картинку
   из st/ на этом же сайте, и только если её там ещё нет — из Supabase. На устройстве игрока ничего не сохраняется.
   Чтобы выключить, замените содержимое этого файла на:
   self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister()));  */
const RX=/^https:\/\/gwrrvfrgovmcwpeogdio\.supabase\.co\/storage\/v1\/object\/public\/([A-Za-z0-9._\-\/]+\.(?:webp|png|jpe?g|gif|svg|avif))$/i;
const MISS=new Map();
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  try{for(const k of await caches.keys())if(k.indexOf('andra-img-')===0)await caches.delete(k);}catch(err){}
  await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||r.headers.has('range'))return;
  const m=RX.exec(r.url);if(!m)return;
  e.respondWith((async()=>{
    const p=m[1],t=MISS.get(p);
    if(!t||Date.now()-t>600000){
      try{
        const res=await fetch('/st/'+p,{credentials:'same-origin'});
        if(res.ok&&/^image\//i.test(res.headers.get('content-type')||''))return res;
      }catch(err){}
      MISS.set(p,Date.now());
    }
    return fetch(r);
  })());
});
