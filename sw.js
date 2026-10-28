// Subir CACHE al publicar cambios: el service worker descarta las cachés viejas.
const CACHE='mi-casa-v1';
const FILES=['./','index.html','manifest.webmanifest','assets/icon.svg','src/main.js','src/styles/app.css','src/lib/db.js','src/lib/money.js','src/lib/dates.js','src/lib/finance.js','src/lib/calendar.js','src/lib/backup.js'];
const url=p=>new URL(p,self.registration.scope).href;
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(url))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c))}return res})
    .catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match(url('index.html')):Response.error()))));
});
