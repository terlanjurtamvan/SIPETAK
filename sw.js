'use strict';
const CACHE='sipetak-shell-v3-8-4-ai-dokumen-sw-fix-1';
const ASSETS=['./','./index.html','./styles.css','./workflow.css','./design-system.css','./theme.js','./multiyear.js','./multiyear.css','./quick-entry.css','./quick-entry.js','./lifecycle.css','./lifecycle-engine.js','./lifecycle-ui.js','./supabase-sync.js','./push-client.js','./app.js','./workflow.js','./katalog-kinerja.js','./skp-planner.js','./skp-planner.css','./guide.js','./guide.css','./automation-engine.js','./automation-ui.js','./automation.css','./ai-assistant.js','./ai-assistant.css','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sipetak-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Only public, versioned shell assets may enter the offline cache. Never cache API/data responses.
const SHELL_PATHS=new Set(ASSETS.map(x=>new URL(x,self.location.href).pathname));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!SHELL_PATHS.has(url.pathname)||url.search)return;
 event.respondWith(fetch(request).then(response=>{
   if(response.ok&&response.type==='basic'){
     const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy)).catch(()=>{});
   }
   return response;
 }).catch(()=>caches.match(request)));
});
self.addEventListener('push',e=>{const data=e.data?.json?.()||{};e.waitUntil(self.registration.showNotification('Pengingat SIPETAK',{body:'Ada pekerjaan atau bukti dukung yang perlu diperiksa. Buka SIPETAK untuk melihat pengingat.',tag:data.tag||'sipetak-deadline',icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',data:{target:'./index.html'}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil((async()=>{const clientsOpen=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const c of clientsOpen){if(c.url.startsWith(self.registration.scope)){await c.focus();c.postMessage({type:'SIPETAK_OPEN_SLA'});return}}await self.clients.openWindow('./index.html')})())});
