const CACHE='muhendislik-v2-20260925';
const CORE=['./','./index.html','./manifest.webmanifest','./apps/hangar/index.html','./apps/profil-kesim/index.html','./apps/plaka-nesting/index.html','./apps/statik/index.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{let cp=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return resp;}).catch(()=>caches.match('./index.html'))));});
