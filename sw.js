const CACHE='mon-muhendislik-v4-1-offline';
const ASSETS=["./", "./01_Celik_Hangar.html", "./02_Profil_Kesim_Optimizasyon.html", "./03_Endustriyel_Statik.html", "./04_Kutu_Profil_Cati.html", "./05_Plaka_Nesting.html", "./desktop.css", "./desktop.js", "./dxf-import.js", "./index.html", "./manifest.webmanifest"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{
   const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
 }).catch(()=>caches.match('./index.html'))));
});
