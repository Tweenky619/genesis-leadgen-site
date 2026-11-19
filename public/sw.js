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
    let title = 'New lead from your team', body = 'Tap to confirm the appointment', tag = 'lead';
    try {
      const a = await getAuth();
      if (a && a.code && a.mgr) {
        const r = await fetch(ARENA + '/api/latest-lead', { headers: { 'X-Team-Code': a.code, 'X-Manager-Code': a.mgr } });
        const j = await r.json();
        if (j && j.lead) {
          const L = j.lead, name = [L.first, L.last].filter(Boolean).join(' ') || 'Homeowner';
          const appt = L.appt_date ? new Date(L.appt_date + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + (L.appt_time ? ' ' + L.appt_time : '') : '';
          title = 'New lead from ' + (j.rep || 'a rep');
          body = [name, L.cell, appt ? 'Appt ' + appt : '', j.address].filter(Boolean).join(' · ');
          tag = 'lead-' + j.id;
        }
      }
    } catch {}
    await self.registration.showNotification(title, { body, tag, icon: '/vp-icon.png?v=3', badge: '/vp-icon.png?v=3', data: { url: '/?arena=leads' } });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { c.postMessage({ type: 'open-arena-leads' }); return c.focus(); } }
    return self.clients.openWindow('/?arena=leads');
  })());
});
