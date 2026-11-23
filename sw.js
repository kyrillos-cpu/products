// يحفظ صور المركبات على الموبايل بعد أول تحميل، فتفتح فورًا المرات الجاية
const IMG_CACHE = 'product-images-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const url = e.request.url;
  const isImg = e.request.destination === 'image' &&
    (url.startsWith('https://lh3.googleusercontent.com/') || url.startsWith('https://drive.google.com/thumbnail'));
  if (!isImg) return; // باقي الطلبات تمشي عادي من النت
  e.respondWith(caches.open(IMG_CACHE).then(async cache => {
    const hit = await cache.match(e.request);
    if (hit) return hit;
    const res = await fetch(e.request);
    if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
    return res;
  }));
});
