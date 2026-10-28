'use strict';
/* SIPETAK 3.1 Supabase connector. PostgreSQL stores AES-GCM ciphertext only.
   Auth password != SIPETAK vault passphrase. No service_role key in browser.
   Offline-first: a failed sync never destroys the IndexedDB vault. */
const SB_CONFIG_KEY = 'sipetak:supabase:config:v3';
const SB_SESSION_KEY = 'sipetak:supabase:session:v3';
const SB_AUTO_KEY = 'sipetak:supabase:auto:v3';
const SB_REMEMBER_KEY = 'sipetak:supabase:remember-account:v1';
let sbBusy = false, sbAutoTimer = null, sbRemoteCache = null;
let sbSession = null;
function sbRead(key, fallback, storage = localStorage) {
  try { const result = storage.getItem(key); return result ? JSON.parse(result) : fallback; }
  catch { return fallback; }
}
/* URL + publishable key are embedded ONCE in index.html at deployment.
   Legacy v3.0 localStorage config is a transition fallback on old devices only.
   Never merge an embedded URL with a key from localStorage. */
const sbPublicBuild = {
  url: document.querySelector?.('meta[name="sipetak-supabase-url"]')?.getAttribute('content') || '',
  publishableKey: document.querySelector?.('meta[name="sipetak-supabase-publishable-key"]')?.getAttribute('content') || ''
};
const sbBuildUrl = String(sbPublicBuild.url || '').trim();
const sbBuildKey = String(sbPublicBuild.publishableKey || '').trim();
const sbBuildReady = Boolean(sbBuildUrl && sbBuildKey);
let sbConfig = sbBuildReady ? {url:sbBuildUrl,key:sbBuildKey} : sbRead(SB_CONFIG_KEY, {url:'', key:''});
let sbOnboardRemote = null;
function sbIsConfigured() { return Boolean(sbConfig.url && sbConfig.key); }
/* Sesi akun dapat dipertahankan pada perangkat pribadi atas persetujuan pengguna.
   Token refresh di localStorage punya risiko XSS; jangan aktifkan pada perangkat bersama. */
let sbRemember = sbRead(SB_REMEMBER_KEY, false) === true;
sbSession = sbRead(SB_SESSION_KEY, null, sessionStorage) || (sbRemember ? sbRead(SB_SESSION_KEY, null, localStorage) : null);
let sbAuto = sbRead(SB_AUTO_KEY, false);
function sbRememberUpdate(remember) {
  sbRemember = Boolean(remember);
  try {
    localStorage.setItem(SB_REMEMBER_KEY, JSON.stringify(sbRemember));
    if (sbRemember && sbSession) localStorage.setItem(SB_SESSION_KEY,JSON.stringify(sbSession));
    else localStorage.removeItem(SB_SESSION_KEY);
  } catch {}
}
function sbStoreSession(session) {
  sbSession = session;
  try {
    if (session) sessionStorage.setItem(SB_SESSION_KEY,JSON.stringify(session));
    else sessionStorage.removeItem(SB_SESSION_KEY);
    if (session && sbRemember) localStorage.setItem(SB_SESSION_KEY,JSON.stringify(session));
    else localStorage.removeItem(SB_SESSION_KEY);
  } catch {}
}
function sbValidConfig() {
  const url = String(sbConfig.url || '').trim().replace(/\/+$/, '');
  const key = String(sbConfig.key || '').trim();
  if (!url || !key) throw Error('Konfigurasi Supabase belum dipasang pada index.html. Hubungi pengelola aplikasi.');
  const u = new URL(url);
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost','127.0.0.1'].includes(u.hostname))) throw Error('URL Supabase harus HTTPS.');
  if (u.username || u.password || u.search || u.hash) throw Error('Alamat Supabase tidak boleh berisi kredensial atau parameter.');
  if (key.startsWith('sb_secret_') || key.toLowerCase().includes('service_role')) throw Error('Jangan gunakan service_role / secret key di aplikasi.');
  if (key.split('.').length === 3) {
    try { const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); if (payload.role === 'service_role') throw Error('Service-role key dilarang di browser.'); } catch (e) { if (String(e.message).includes('dilarang')) throw e; }
  }
  return {url, key};
}
function sbBase() { return sbValidConfig().url; }
function sbRevKey() {
  const origin = new URL(sbBase()).origin;
  return 'sipetak:supabase:revision:v3:' + origin + ':' + (sbSession?.user?.id || 'anonymous');
}
function sbKnownRev() { try { const n=Number(localStorage.getItem(sbRevKey())); return Number.isSafeInteger(n) && n>0 ? n : null; } catch { return null; } }
function sbRememberRev(n) { try { localStorage.setItem(sbRevKey(),String(n)); } catch {} }
function sbClearRev() { try { localStorage.removeItem(sbRevKey()); } catch {} }
async function sbRequest(path,opts={},auth=true,renew=true) {
  const {url,key}=sbValidConfig();
  if (auth) await sbFreshSession();
  const headers = {'apikey':key,'Content-Type':'application/json',...opts.headers};
  if (auth && sbSession?.access_token) headers.Authorization = 'Bearer ' + sbSession.access_token;
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),20000);
  let resp;
  try { resp=await fetch(url + path,{...opts,headers,signal:controller.signal,cache:'no-store'}); }
  catch(e) { throw Error(e.name==='AbortError'?'Koneksi Supabase melewati batas waktu.':'Tidak dapat menghubungi Supabase. Periksa internet, URL, dan koneksi.'); }
  finally { clearTimeout(timer); }
  const raw=await resp.text(); let result=null;
  try { result=raw?JSON.parse(raw):null; } catch { result=raw; }
  if (resp.status===401 && auth && renew && sbSession?.refresh_token) {
    await sbRefresh();return sbRequest(path,opts,auth,false);
  }
  if (!resp.ok) { const msg=typeof result==='object' ? result?.msg||result?.error_description||result?.message||result?.error||result?.details : null; const e=Error(String(msg||('Supabase HTTP '+resp.status))); e.status=resp.status; throw e; }
  return result;
}
async function sbRefresh() {
  if (!sbSession?.refresh_token) { sbStoreSession(null); throw Error('Sesi Supabase habis. Silakan masuk kembali.'); }
  const {url,key}=sbValidConfig();
  const resp=await fetch(url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:sbSession.refresh_token})});
  if (!resp.ok) { sbStoreSession(null); throw Error('Sesi Supabase habis. Masuk kembali.'); }
  const next=await resp.json(); sbStoreSession({...next,expires_at:Math.floor(Date.now()/1000)+(next.expires_in||3600)});
}
async function sbFreshSession() {
  if (!sbSession?.access_token || !sbSession?.user?.id) throw Error('Masuk ke akun Supabase dahulu.');
  if (Number(sbSession.expires_at||0) < Date.now()/1000 + 50) await sbRefresh();
}
function sbAuthIdentity() { return sbSession?.user?.email || 'Belum login'; }
async function sbAuth(email,password,register) {
  if (password.length<8) throw Error('Kata sandi akun Supabase minimal 8 karakter.');
  const path=register?'/auth/v1/signup':'/auth/v1/token?grant_type=password';
  const result=await sbRequest(path,{method:'POST',body:JSON.stringify({email,password})},false);
  if (result?.access_token && result?.user) {
    sbStoreSession({...result,expires_at:Math.floor(Date.now()/1000)+(result.expires_in||3600)});
    return 'Berhasil masuk akun Supabase.';
  }
  if (register) return 'Pendaftaran diminta. Periksa email untuk verifikasi sebelum login (jika verifikasi diaktifkan).';
  throw Error('Login tidak menghasilkan sesi pengguna.');
}
function supabasePage() {
  const configured=sbIsConfigured(), signed=Boolean(sbSession?.user?.id);
  const identity=txt(sbAuthIdentity());
  return `<div class="section-head"><div><h3>Supabase • Database & sinkronisasi</h3><p>Simpan satu brankas terenkripsi pribadi pada database Supabase milik instansi/akun Anda.</p></div></div>
  <div class="sb-steps"><div class="sb-step"><b>01 · Koneksi siap</b><span>Konfigurasi proyek ditetapkan sekali oleh pengelola.</span></div><div class="sb-step"><b>02 · Akun</b><span>Daftar atau login dengan Supabase Auth.</span></div><div class="sb-step"><b>03 · Migrasi</b><span>Kirim brankas dari MacBook; ambil di iPhone.</span></div></div>
  <div class="sb-status"><b>Status:</b> ${configured?'Proyek dikonfigurasi':'Belum dikonfigurasi'} · ${signed?'Login: '+identity:'Belum login'} · Revisi lokal tersinkron: ${sbKnownRev()||'belum ada'}</div>
  <div class="callout warn"><b>Jangan gunakan kunci rahasia (service_role/secret key).</b> Gunakan hanya <i>publishable key</i> atau <i>anon key</i>. Isi database adalah ciphertext AES-GCM; pemilik akun masih membutuhkan kata sandi brankas SIPETAK. Tidak ada unggahan otomatis sampai Anda memilihnya.</div>
  <div class="split2"><section class="card"><h3>Koneksi Supabase</h3>
  <div class="sb-status"><b>${configured?'✓ Proyek sudah disiapkan':'⚠ Koneksi belum disiapkan'}</b></div>
  <p class="sb-inline">${configured?'URL proyek dan publishable key dibundel pada index.html. Perangkat baru tidak perlu mengisinya.':'Pengelola perlu memasukkan Project URL dan publishable key di index.html satu kali, lalu menerbitkan aplikasi pada HTTPS.'}</p>
  <p class="sb-inline">${sbBuildReady?'Konfigurasi pusat aktif pada semua perangkat.':(configured?'Memakai konfigurasi lama di perangkat ini; agar perangkat baru bisa login, konfigurasi harus dimasukkan dalam index.html.':'Jangan masukkan kunci admin rahasia ke kode publik.')} Pastikan migrasi SQL dan RLS Supabase sudah aktif.</p></section>
  <section class="card"><h3>Autentikasi Supabase</h3>${signed?`<p>Masuk sebagai <b>${identity}</b>.</p><div class="actions"><button class="btn ghost" data-action="sb-signout">Keluar dari Supabase</button><button class="btn secondary" data-action="sb-status">Periksa data cloud</button></div><label class="sb-inline" style="display:block;margin-top:12px"><input id="sbRememberToggle" type="checkbox" ${sbRemember?'checked':''}> Ingat login Supabase pada perangkat pribadi ini</label>`:
  `<form id="sbAuthForm" class="form-grid">${field('Email akun','email','email','','nama@contoh.go.id',true,true)}${field('Kata sandi akun Supabase','password','password','','Tidak sama dengan kata sandi brankas',true,true)}
  <label class="field span2"><input type="checkbox" name="rememberDevice" value="yes" ${sbRemember?'checked':''}> Tetap login Supabase di perangkat pribadi ini</label>
  <div class="field span2"><div class="actions"><button class="btn" type="submit" name="intent" value="login" ${configured?'':'disabled'}>Masuk</button><button class="btn secondary" type="submit" name="intent" value="register" ${configured?'':'disabled'}>Daftar akun</button></div></div></form>`}
  <p class="sb-inline">Kata sandi Supabase dan kata sandi brankas SIPETAK adalah dua hal berbeda. Jika centang “Tetap login” aktif, sesi dapat dilanjutkan pada perangkat ini setelah aplikasi web dimulai ulang. Jangan gunakan pada perangkat bersama.</p></section></div>
  <section class="card"><h3>Kontrol migrasi terenkripsi</h3><p class="hint">MacBook: buat cadangan .sipetak, lalu kirim. iPhone: login akun Supabase yang sama, lalu ambil data menggunakan kata sandi brankas dari MacBook.</p>
  <div class="actions"><button class="btn" data-action="sb-upload" ${signed?'':'disabled'}>↑ Kirim data terenkripsi</button><button class="btn secondary" data-action="sb-prepare-pull" ${signed?'':'disabled'}>↓ Ambil dari Supabase</button><button class="btn ghost" data-action="backup">Buat cadangan lokal</button><button class="btn ghost" data-action="sb-status" ${signed?'':'disabled'}>Cek revisi cloud</button></div>
  <div class="field" style="margin-top:14px"><label><input style="width:auto;min-height:auto" type="checkbox" id="sbAutoToggle" ${sbAuto?'checked':''}> Kirim otomatis setelah penyimpanan lokal <b>(hanya jika revisi cocok)</b></label></div>
  <p class="sb-inline">Tidak ada penggabungan konflik otomatis. Jika kedua perangkat mengubah data offline, sinkronisasi berhenti dan masing-masing perlu dicadangkan lalu direkonsiliasi.</p></section>
  <section class="card"><h3>Notifikasi tetap tersedia</h3><p>Menu <b>SLA & Pengingat</b> dan ekspor Kalender tetap digunakan. Untuk Web Push saat aplikasi tertutup, gunakan server push opsional yang dikelola instansi; Supabase database saja tidak mengirim alarm bunyi otomatis.</p></section>`;
}
async function sbGetRemote(full=true) {
  await sbFreshSession();
  const owner=encodeURIComponent(sbSession.user.id);
  const select=full?'owner_id,revision,vault,updated_at':'owner_id,revision,updated_at';
  const rows=await sbRequest('/rest/v1/sipetak_vaults?owner_id=eq.'+owner+'&select='+select+'&limit=1');
  return Array.isArray(rows)?rows[0]||null:null;
}
async function sbStatus() {
  const remote=await sbGetRemote(false); sbRemoteCache=remote;
  const local=sbKnownRev();
  const message=!remote?'Cloud belum berisi brankas Anda.':`Revisi cloud ${remote.revision}, revisi diketahui perangkat ${local||'belum ada'}, terakhir ${new Date(remote.updated_at).toLocaleString('id-ID')}.`;
  toast(message);if(view==='supabase')render();return remote;
}
async function sbUpload(automatic=false) {
  if(sbBusy || !data || !vaultKey) return;
  if(automatic && (!sbAuto || !navigator.onLine || !sbSession?.access_token)) return;
  sbBusy=true;
  try {
    await sbFreshSession();
    if(data?.wfSettings?.cloud?.auto) throw Error('Nonaktifkan sinkronisasi otomatis server lama pada menu Sinkronisasi sebelum memakai Supabase.');
    await lastWrite;
    const localVault=await getEnvelope();
    if (!localVault || localVault.format!=='sipetak-vault-v1') throw Error('Brankas lokal belum tersedia.');
    const remote=await sbGetRemote(false);
    const previous=sbKnownRev();
    let saved;
    if(!remote) {
      if(previous) throw Error('Cloud kosong, tetapi perangkat punya nomor revisi lama. Periksa proyek Supabase.');
      const results=await sbRequest('/rest/v1/sipetak_vaults?select=revision',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({owner_id:sbSession.user.id,vault:localVault,revision:1})});
      saved=results?.[0];
    } else {
      if(remote.revision!==previous) throw Error('Konflik revisi: cloud v'+remote.revision+', perangkat v'+(previous||'belum pernah sinkron')+'. Buat cadangan lalu ambil versi cloud atau rekonsiliasi secara manual. Data tidak ditimpa.');
      const row='/rest/v1/sipetak_vaults?owner_id=eq.'+encodeURIComponent(sbSession.user.id)+'&revision=eq.'+remote.revision+'&select=revision';
      const results=await sbRequest(row,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({vault:localVault,revision:remote.revision+1})});
      saved=results?.[0];
      if(!saved) throw Error('Konflik: versi cloud berubah saat pengiriman. Tidak ada data yang ditimpa.');
    }
    if(!saved) throw Error('Server tidak mengonfirmasi penyimpanan.');
    sbRememberRev(saved.revision); sbRemoteCache=null;
    if(!automatic) toast('Brankas terenkripsi berhasil dikirim ke Supabase (revisi '+saved.revision+').');
    if(view==='supabase')render();
  } catch(e) {
    if(automatic) { sbAuto=false; try {localStorage.setItem(SB_AUTO_KEY,'false')}catch{}; toast('Sinkronisasi otomatis berhenti: '+e.message,true); }
    else fail(e);
  } finally { sbBusy=false; }
}
function sbPullForm() {
  if(!sbSession?.user) return toast('Masuk ke Supabase dahulu.',true);
  openModal('Ambil brankas Supabase','Ganti seluruh data lokal dengan brankas terenkripsi di cloud.',
    `<div class="callout critical"><b>Perhatian:</b> proses ini menimpa jurnal/telaahan/bukti pada perangkat ini, tidak menggabungkan perubahan. Unduh cadangan lokal sebelum melanjutkan.</div>
    <div class="form-grid">${field('Kata sandi brankas sumber (MacBook)','vaultPassword','password','','Kata sandi brankas SIPETAK dari perangkat sumber',true,true)}
    ${field('Ketik GANTI untuk konfirmasi','confirmation','text','','GANTI',true,true)}</div>
    <p class="hint">Kata sandi yang diminta adalah kata sandi brankas SIPETAK, <b>bukan</b> kata sandi login Supabase.</p>`,null,'sbPullForm');
}
async function sbPull(password) {
  if(sbBusy) throw Error('Sedang ada operasi sinkronisasi lain.');
  sbBusy=true;
  try {
    const remote=await sbGetRemote(true);
    if(!remote?.vault) throw Error('Belum ada brankas di Supabase. Kirim dahulu dari MacBook.');
    if(remote.vault.format!=='sipetak-vault-v1') throw Error('Versi brankas cloud tidak dikenali.');
    const key=await makeKey(password,bytesFromB64(remote.vault.salt),remote.vault.iterations);
    const restored=await decryptVault(remote.vault,key);
    await lastWrite;
    await trustedDisable();
    await putEnvelope(remote.vault);
    data=restored;vaultKey=key;vaultEnvelope=remote.vault;lastWrite=Promise.resolve();
    sbRememberRev(remote.revision); sbAuto=false;
    try { localStorage.setItem(SB_AUTO_KEY,'false'); } catch {}
    ensureWorkflow();ensureMultiYear();startWorkflowLoop();closeModal();navigate('dashboard');
    toast('Data cloud dipulihkan. Periksa dahulu, lalu aktifkan sinkronisasi otomatis jika diperlukan.');
  } finally { sbBusy=false; }
}
/* Perangkat baru: login akun -> unduh ciphertext -> buka dengan kata sandi
   brankas lama. Tidak menciptakan ruang kerja kosong dan tidak menimpa data. */
function sbShowCloudLogin() {
  try { sbValidConfig(); }
  catch(err) { toast(err.message,true); return; }
  if (vaultEnvelope || data) { toast('Perangkat ini sudah memiliki brankas. Buka terlebih dahulu sebelum sinkronisasi.',true); return; }
  $('authContent').innerHTML = `<h2>Masuk dari perangkat baru</h2>
    <p>Gunakan akun SIPETAK (Supabase) yang sama dengan perangkat utama. Tidak perlu memasukkan URL atau publishable key.</p>
    <form id="sbOnboardLogin" class="form-grid">
      <div id="sbOnboardError" class="errorbox span2" role="alert" style="min-height:0"></div>
      ${field('Email akun','email','email','','email@contoh.go.id',true,true)}
      ${field('Kata sandi akun','password','password','','Kata sandi login Supabase',true,true)}
      <label class="field span2"><input type="checkbox" name="rememberDevice" value="yes" ${sbRemember?'checked':''}> Tetap login di perangkat pribadi ini</label>
      <button class="btn full span2" type="submit">Masuk & cari data saya →</button>
    </form>
    <p class="hint" style="margin-top:15px">Untuk keamanan, setelah login Anda perlu memasukkan kata sandi brankas lama sekali pada perangkat baru. Kata sandi brankas tidak dapat direset melalui email Supabase.</p>
    <button class="btn ghost" data-action="sb-back-to-create">← Kembali ke ruang kerja lokal</button>`;
}
function sbShowCloudUnlock() {
  $('authContent').innerHTML = `<h2>Data cloud ditemukan</h2>
    <p>Akun <b>${txt(sbAuthIdentity())}</b> mempunyai brankas terenkripsi. Masukkan kata sandi brankas yang digunakan pada perangkat utama.</p>
    <form id="sbOnboardUnlock" class="form-grid">
      <div id="sbOnboardError" class="errorbox span2" role="alert" style="min-height:0"></div>
      ${field('Kata sandi brankas lama','vaultPassword','password','','Kata sandi brankas dari MacBook',true,true)}
      <button class="btn full span2" type="submit">Buka data saya di perangkat ini →</button>
    </form>
    <div class="callout warn" style="margin-top:15px">Data terenkripsi disalin ke perangkat ini. Perubahan berikutnya memerlukan sinkronisasi; tidak ada penggabungan konflik otomatis.</div>
    <button class="btn ghost" data-action="sb-back-to-create">← Kembali</button>`;
}
async function sbCompleteCloudOnboarding(password) {
  if(!sbOnboardRemote?.vault) throw Error('Sesi pemulihan tidak ditemukan. Ulangi login.');
  if(await getEnvelope()) throw Error('Sudah ada brankas lokal, pemulihan perangkat baru dibatalkan.');
  const remote=sbOnboardRemote;
  const env=remote.vault;
  const key=await makeKey(password,bytesFromB64(env.salt),env.iterations);
  const decoded=await decryptVault(env,key);
  await lastWrite;
  await trustedDisable();
  await putEnvelope(env);
  vaultEnvelope=env;vaultKey=key;data=decoded;lastWrite=Promise.resolve();
  sbRememberRev(remote.revision); sbOnboardRemote=null;
  sbAuto=false;try { localStorage.setItem(SB_AUTO_KEY,'false'); } catch {}
  showApp();toast('Berhasil masuk dan mengambil data terenkripsi. Aktifkan sinkronisasi otomatis setelah memeriksa isi data.');
}
document.addEventListener('click',e=>{
  const action=e.target?.closest?.('[data-action]')?.dataset?.action;
  if(action==='sb-new-device'){e.preventDefault();sbShowCloudLogin();}
  if(action==='sb-back-to-create'){e.preventDefault();sbOnboardRemote=null;renderAuth('create');}
});

function sbBusyButton(el,b) { if(!el)return;el.disabled=!!b;el.dataset.busy=b?'true':'false'; }
window.SIPETAK_SB_ACTION=function(el) {
  const a=el.dataset.action;
  if(!a?.startsWith('sb-'))return false;
  if(a==='sb-upload') sbUpload(false).catch(fail);
  else if(a==='sb-status') sbStatus().catch(fail);
  else if(a==='sb-prepare-pull') sbPullForm();
  else if(a==='sb-signout'){(async()=>{try{if(window.SIPETAK_PUSH?.beforeSignOut)await window.SIPETAK_PUSH.beforeSignOut();await sbRequest('/auth/v1/logout',{method:'POST'});}catch{}finally{sbStoreSession(null);sbRememberUpdate(false);sbAuto=false;try{localStorage.setItem(SB_AUTO_KEY,'false')}catch{};toast('Keluar dari akun Supabase. Data lokal tetap aman.');render();}})();}
  return true;
};
document.addEventListener('submit',e=>{
  if(!['sbAuthForm','sbPullForm','sbOnboardLogin','sbOnboardUnlock'].includes(e.target?.id))return;
  e.preventDefault();e.stopImmediatePropagation();
  const form=e.target, values=Object.fromEntries(new FormData(form)),button=e.submitter||form.querySelector('[type=submit]');
  sbBusyButton(button,true);
  (async()=>{
    if(form.id==='sbOnboardLogin'){
      const message=$('sbOnboardError');
      try {
        sbRememberUpdate(values.rememberDevice==='yes');
        await sbAuth(String(values.email||'').trim(),String(values.password||''),false);
        const remote=await sbGetRemote(true);
        if(!remote?.vault) throw Error('Belum ada brankas cloud untuk akun ini. Pada MacBook sumber, buka menu Supabase lalu pilih Kirim data terenkripsi.');
        if(await getEnvelope()) throw Error('Perangkat ini sudah mempunyai data lokal. Buka data lokal terlebih dahulu sebelum melakukan pemulihan.');
        sbOnboardRemote=remote;
        sbShowCloudUnlock();
      } catch(err) { if (message) message.textContent=err.message; else fail(err); }
    } else if(form.id==='sbOnboardUnlock'){
      const message=$('sbOnboardError');
      try { await sbCompleteCloudOnboarding(String(values.vaultPassword||'')); }
      catch(err) { if (message) message.textContent=err.message; else fail(err); }
    } else if(form.id==='sbAuthForm'){
      sbRememberUpdate(values.rememberDevice==='yes');
      const result=await sbAuth(String(values.email||'').trim(),String(values.password||''),button.value==='register');
      toast(result);render();
    } else if(form.id==='sbPullForm'){
      if(values.confirmation!=='GANTI')throw Error('Ketik tepat GANTI untuk menimpa data lokal.');
      await sbPull(values.vaultPassword||'');
    }
  })().catch(fail).finally(()=>sbBusyButton(button,false));
},true);
document.addEventListener('change',e=>{
  if(e.target?.id==='sbRememberToggle'){
    sbRememberUpdate(e.target.checked);
    toast(sbRemember?'Login Supabase akan diingat pada perangkat pribadi ini.':'Login Supabase tidak lagi diingat setelah sesi berakhir.');
    return;
  }
  if(e.target?.id==='sbAutoToggle'){
    if(e.target.checked && data?.wfSettings?.cloud?.auto){e.target.checked=false;toast('Nonaktifkan sinkronisasi otomatis server lama dahulu.',true);return;}
    if(e.target.checked && (!sbSession?.user?.id || !sbKnownRev())){
      e.target.checked=false;toast('Login dan kirim/ambil data terlebih dahulu sebelum mengaktifkan otomatis.',true);return;
    }
    sbAuto=e.target.checked;try{localStorage.setItem(SB_AUTO_KEY,JSON.stringify(sbAuto))}catch{}
    toast(sbAuto?'Sinkronisasi otomatis aktif.':'Sinkronisasi otomatis nonaktif.');
  }
});
/* queueSave() in app.js calls workflowSaved() right after enqueuing encryption.
   Only transmit after lastWrite has completed. Debounce rapid changes. */
const sbPriorSaved = workflowSaved;
workflowSaved = function(){sbPriorSaved();if(!sbAuto||!sbSession?.user?.id)return;clearTimeout(sbAutoTimer);sbAutoTimer=setTimeout(()=>{if(data&&vaultKey)sbUpload(true)},1750);};
