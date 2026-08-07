/* MANGRO | Registro de Gastos — service worker
   OJO: cada vez que se publique una version nueva hay que subir este numero,
   si no los usuarios siguen viendo la version guardada en su dispositivo. */
const CACHE = 'mangro-gastos-v9';
const ARCHIVOS = [
  './', './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-180.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ARCHIVOS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

/* Red primero para el documento (asi un despliegue nuevo se ve enseguida) y
   cache como respaldo cuando no hay internet. */
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   // Supabase y fuentes van directo a la red

  if(req.mode === 'navigate' || req.destination === 'document'){
    e.respondWith(
      fetch(req).then(r=>{
        const copia = r.clone();
        caches.open(CACHE).then(c=>c.put(req, copia));
        return r;
      }).catch(()=>caches.match(req).then(r=>r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r=> r || fetch(req).then(resp=>{
    const copia = resp.clone();
    caches.open(CACHE).then(c=>c.put(req, copia));
    return resp;
  }).catch(()=>r)));
});
