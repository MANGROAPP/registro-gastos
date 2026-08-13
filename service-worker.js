/* MANGRO | Registro de Gastos - service worker
   El nombre del cache ES la etiqueta de la version publicada. Si no se cambia,
   los celulares que ya tienen la app instalada siguen sirviendo la copia vieja.
   Debe coincidir con APP_VERSION dentro de index.html. */
const CACHE = 'mangro-gastos-v2.5.0';
const ARCHIVOS = [
  './', './index.html', './manifest.json',
  './favicon-v2.ico',
  './icons/icon-192-v2.png', './icons/icon-512-v2.png',
  './icons/icon-maskable-512-v2.png',
  './icons/apple-180-v2.png'
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
  /* El manifest y los iconos tambien van con red primero: asi un cambio de
     icono llega sin esperar a que caduque nada en el dispositivo. */
  if(req.destination === 'manifest' || /manifest\.json$|\/icons\/|favicon/.test(url.pathname)){
    e.respondWith(
      fetch(req).then(r=>{
        const copia = r.clone();
        caches.open(CACHE).then(c=>c.put(req, copia));
        return r;
      }).catch(()=>caches.match(req))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r=> r || fetch(req).then(resp=>{
    const copia = resp.clone();
    caches.open(CACHE).then(c=>c.put(req, copia));
    return resp;
  }).catch(()=>r)));
});
