'use strict';
/* SIPETAK Smart Push 3.5: no task text is ever uploaded to the push queue. */
(function(){
 const CONFIG=(document.querySelector('meta[name="sipetak-push-worker-url"]')?.content||'').trim().replace(/\/+$/,'');
 const OFFSETS=[1440,180,30,0];
 const STATE_PREFIX='sipetak:push:enabled:v1:';
 let timer=null,busy=false,pending=false,lastStatus='Belum diaktifkan';
 const account=()=>typeof sbSession!=='undefined'?sbSession?.user?.id:null;
 const enabledKey=()=>STATE_PREFIX+(account()||'none');
 const isEnabled=()=>!!account()&&localStorage.getItem(enabledKey())==='true';
 function configured(){return /^https:\/\/[^/\s]+$/.test(CONFIG)&&!CONFIG.includes('WORKER_URL');}
 function b64ToBytes(value){const pad='='.repeat((4-value.length%4)%4);return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+pad),c=>c.charCodeAt(0));}
 function status(text){lastStatus=text;if(typeof view!=='undefined'&&view==='sla'&&typeof render==='function')render();}
 async function workerConfig(){
   if(!configured())throw Error('Alamat layanan Push belum dikonfigurasi di index.html.');
   const response=await fetch(CONFIG+'/config',{cache:'no-store'});
   if(!response.ok)throw Error('Server Push belum dapat dihubungi ('+response.status+').');
   const conf=await response.json();
   if(!conf.configured||!conf.vapidPublicKey)throw Error('Konfigurasi server Push belum lengkap.');
   return conf;
 }
 function deadlines(){
   if(typeof data==='undefined'||!data||typeof wfAllDeadlines!=='function')return [];
   const todayMs=Date.now();
   const all=wfAllDeadlines().slice();
   // Include minutes of future meetings; live SLA lists may only expose them near the meeting.
   for(const m of data.meetings||[]){
     if(m.minutesStatus==='Selesai'||!m.minutesDueAt)continue;
     if(typeof myYearArchived==='function' && typeof myYearOf==='function' && myYearArchived(myYearOf(m,'meetings')))continue;
     all.push({id:'m-min-'+m.id,dueAt:m.minutesDueAt});
   }
   const rows=[],seen=new Set();
   for(const x of all){
     if(typeof x.id!=='string'||!x.id||x.id.length>128)continue;
     const due=new Date(x.dueAt),ms=due.getTime();
     if(!Number.isFinite(ms)||ms<=todayMs||ms>todayMs+366*86400000)continue;
     for(const off of OFFSETS){
       const when=ms-off*60000;
       if(when<todayMs-60000)continue;
       const key=x.id+':'+off;if(seen.has(key))continue;seen.add(key);
       rows.push({item_key:x.id,due_at:due.toISOString(),offset_minutes:off});
     }
   }
   // Generic follow-up after a completed task still has no linked evidence. Only opaque IDs and timestamps.
   for(const f of window.SIPETAK_AUTOMATION?.followups(data,{now:todayMs})||[]){
     if(!seen.has(f.item_key+':'+f.offset_minutes)){seen.add(f.item_key+':'+f.offset_minutes);rows.push(f)}
   }
   if(rows.length>600)throw Error('Terlalu banyak pengingat. Kurangi pekerjaan aktif atau arsipkan tahun selesai (maksimum 600 tahap pengingat).');
   return rows;
 }
 async function uploadSchedule(showToast=false){
   if(!isEnabled())throw Error('Aktifkan notifikasi pada perangkat ini terlebih dahulu.');
   if(typeof sbFreshSession==='function')await sbFreshSession();
   if(typeof vaultKey!=='undefined'&&!vaultKey)throw Error('Buka brankas SIPETAK sebelum menyinkronkan jadwal.');
   const rows=deadlines();
   await sbRequest('/rest/v1/rpc/sipetak_replace_push_schedule',{
     method:'POST',body:JSON.stringify({p_rows:rows})
   });
   status('Jadwal push tersimpan: '+rows.length+' tahap pengingat.');
   if(showToast)toast('Pengingat untuk '+rows.length+' tahap telah disinkronkan ke Supabase.');
   return rows.length;
 }
 async function syncSafely(){
   if(busy){pending=true;return;}
   busy=true;
   try{await uploadSchedule(false);}catch(e){lastStatus='Gagal sinkron jadwal: '+(e.message||e);console.warn('Push schedule:',e.message||e);}
   finally{busy=false;if(pending){pending=false;setTimeout(syncSafely,1200);}}
 }
 function onLocalSave(){
   if(!isEnabled()||!navigator.onLine)return;
   clearTimeout(timer);
   timer=setTimeout(syncSafely,1500);
 }
 async function enable(){
   try{
     if(!configured())throw Error('Pengelola perlu mengisi alamat Cloudflare Worker pada index.html.');
     if(!account())throw Error('Silakan login ke Supabase terlebih dahulu.');
     if(!window.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))
       throw Error('Perangkat/browser belum mendukung Web Push. Pada iPhone gunakan ikon SIPETAK di Layar Utama, minimal iOS 16.4.');
     // Must be invoked directly from a tap/click; no network work before asking permission.
     const permission=await Notification.requestPermission();
     if(permission!=='granted')throw Error('Izin notifikasi belum diberikan. Periksa Pengaturan iPhone/MacBook.');
     const [conf,reg]=await Promise.all([workerConfig(),navigator.serviceWorker.ready]);
     let sub=await reg.pushManager.getSubscription();
     if(sub){
       const current=Array.from(new Uint8Array(sub.options.applicationServerKey||[]));
       const desired=Array.from(b64ToBytes(conf.vapidPublicKey));
       if(current.length!==desired.length||current.some((v,i)=>v!==desired[i])){
         await sub.unsubscribe();sub=null;
       }
     }
     if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(conf.vapidPublicKey)});
     const x=sub.toJSON();
     if(!x?.endpoint||!x.keys?.p256dh||!x.keys?.auth)throw Error('Pendaftaran push tidak menghasilkan kunci perangkat.');
     await sbRequest('/rest/v1/sipetak_push_devices?on_conflict=user_id,endpoint',{
       method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
       body:JSON.stringify({user_id:account(),endpoint:x.endpoint,p256dh:x.keys.p256dh,auth_key:x.keys.auth})
     });
     localStorage.setItem(enabledKey(),'true');
     await uploadSchedule(false);
     toast('Notifikasi iPhone/MacBook aktif. Gunakan Uji Push Server untuk memeriksa.');
   }catch(e){toast('Gagal mengaktifkan push: '+(e.message||e),true);}
   finally{if(typeof view!=='undefined'&&view==='sla')render();}
 }
 async function disable(){
   try{
     if(!account())throw Error('Login Supabase diperlukan untuk menonaktifkan perangkat.');
     const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
     if(sub){
       await sbRequest('/rest/v1/sipetak_push_devices?user_id=eq.'+encodeURIComponent(account())+'&endpoint=eq.'+encodeURIComponent(sub.endpoint),{method:'DELETE'});
       await sub.unsubscribe();
     }
     localStorage.removeItem(enabledKey());
     toast('Notifikasi Push dinonaktifkan pada perangkat ini.');
   }catch(e){toast('Gagal menonaktifkan: '+(e.message||e),true);}
   finally{if(typeof view!=='undefined'&&view==='sla')render();}
 }
 async function test(){
   try{
     if(!isEnabled())throw Error('Aktifkan perangkat lebih dahulu.');
     await sbFreshSession();
     const resp=await fetch(CONFIG+'/test',{
       method:'POST',headers:{Authorization:'Bearer '+sbSession.access_token,'Content-Type':'application/json'},
       body:'{}',cache:'no-store'
     });
     const result=await resp.json().catch(()=>({}));
     if(!resp.ok)throw Error(result.error||('Uji server gagal (HTTP '+resp.status+')'));
     if(result.delivered<1)throw Error('Belum ada perangkat yang menerima kiriman.');
     toast('Push dikirim server. Periksa notifikasi sistem pada perangkat.');
   }catch(e){toast('Uji Push: '+(e.message||e),true);}
 }
 function panel(){
   const state=isEnabled();
   const permission=typeof Notification==='undefined'?'Tidak didukung':Notification.permission;
   return `<section class="card" id="sipetak-push-settings"><div class="section-head"><div><h3>🔔 Smart Notification — saat aplikasi ditutup</h3><p>Pengingat melalui Apple/Google Push, tanpa perlu menjalankan SIPETAK di belakang layar.</p></div><span class="tag ${state?'':'gray'}">${state?'Diaktifkan':'Belum aktif'}</span></div>
   <p class="hint">Status server: ${configured()?'Alamat dikonfigurasi':'Belum dikonfigurasi'} · Izin perangkat: ${permission}. ${lastStatus}</p>
   <div class="actions"><button class="btn" data-action="smart-push-enable">Aktifkan Push di perangkat ini</button>
   <button class="btn secondary" data-action="smart-push-sync" ${state?'':'disabled'}>↻ Perbarui jadwal</button>
   <button class="btn secondary" data-action="smart-push-test" ${state?'':'disabled'}>Uji Push Server</button>
   ${state?'<button class="btn ghost" data-action="smart-push-disable">Matikan di perangkat ini</button>':''}</div>
   <div class="callout" style="margin-top:15px">Pengingat otomatis pada <b>24 jam, 3 jam, 30 menit, dan saat tenggat</b>, ditambah satu pengingat umum 24 jam setelah tugas selesai jika belum ada bukti. Supabase hanya menerima ID acak dan waktu pengingat. <b>Judul, isi dokumen, dan kata sandi brankas tidak dikirim.</b> Saat pekerjaan selesai, jadwal diperbarui setelah tersambung internet. Jika offline, notifikasi lama mungkin masih terkirim.</div>
   <p class="hint">iPhone: jalankan SIPETAK dari ikon Layar Utama, izinkan Notifikasi, dan gunakan akun Supabase. Suara tetap mengikuti pengaturan iOS/Mode Fokus. Jangan gunakan pada perangkat bersama.</p></section>`;
 }
 function action(el){const a=el.dataset.action;
   if(!a?.startsWith('smart-push-'))return false;
   if(a==='smart-push-enable')enable();
   else if(a==='smart-push-disable')disable();
   else if(a==='smart-push-test')test();
   else if(a==='smart-push-sync')uploadSchedule(true).catch(e=>toast(e.message||String(e),true));
   return true;
 }
 async function beforeSignOut(){
   if(!isEnabled())return;
   const reg=await navigator.serviceWorker.ready;
   const sub=await reg.pushManager.getSubscription();
   if(sub){await sbRequest('/rest/v1/sipetak_push_devices?user_id=eq.'+encodeURIComponent(account())+'&endpoint=eq.'+encodeURIComponent(sub.endpoint),{method:'DELETE'});await sub.unsubscribe();}
   localStorage.removeItem(enabledKey());
 }
 window.addEventListener('online',()=>{if(isEnabled())onLocalSave();});
 navigator.serviceWorker?.addEventListener('message',e=>{
   if(e.data?.type==='SIPETAK_OPEN_SLA'&&typeof navigate==='function'&&typeof data!=='undefined'&&data)navigate('sla');
 });
 window.SIPETAK_PUSH={panel,action,onLocalSave,deadlines,enable,disable,test,beforeSignOut};
})();
