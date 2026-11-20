// Villa Pacifica Lead Gen service worker — only shows new-lead alerts from Canvassing Arena (no caching).
const ARENA = 'https://canvassing-arena.pages.dev';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'auth')
    e.waitUntil(caches.open('vp-auth').then(c => c.put('/__auth', new Response(JSON.stringify(e.data.auth)))));
});
async function getAuth() {
  try { const r = await (await caches.open('vp-auth')).match('/__auth'); return r ? await r.json() : null; } catch { return null; }
}
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let title = 'Lead update', body = 'Tap to open', tag = 'alert';
    try {
      const a = await getAuth();
      if (a && a.wl) {   // white-label company: owner updates
        const r = await fetch(ARENA + '/wl-api/latest', { headers: { 'X-WL-Company': a.wl.id, 'X-WL-Key': a.wl.mkey } });
        const j = await r.json();
        if (j && j.title) { title = j.title; body = j.body || ''; tag = j.tag || 'alert'; }
      } else if (a && a.code && a.mgr) {
        const r = await fetch(ARENA + '/api/latest-event', { headers: { 'X-Team-Code': a.code, 'X-Manager-Code': a.mgr } });
        const j = await r.json();
        if (j && j.title) { title = j.title; body = j.body || ''; tag = j.tag || 'alert'; }
      }
    } catch {}
    await self.registration.showNotification(title, { body, tag, icon: '/app-icon-180.png', badge: '/app-icon-180.png', data: { url: '/app/' } });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { c.postMessage({ type: 'open-arena-leads' }); return c.focus(); } }
    return self.clients.openWindow('/app/');
  })());
});
