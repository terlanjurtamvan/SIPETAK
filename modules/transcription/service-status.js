'use strict';
/* Diagnostics of server configuration. This does not process audio or credentials. */
(function(root){
 const explanations={
  'not-enabled':'Belum aktif: nyalakan TRANSCRIBE_LIVE_ENABLED=true pada Cloudflare Pages.',
  'key-missing':'Belum aktif: tambahkan OPENAI_API_KEY sebagai secret Cloudflare.',
  'd1-missing':'Belum aktif: hubungkan database D1 dengan nama TRANSCRIBE_DB.',
  'd1-table-missing':'Belum aktif: jalankan cloudflare/transcription-quota.sql pada database D1.',
  'auth-config-missing':'Belum aktif: isi SUPABASE_URL dan SUPABASE_PUBLISHABLE_KEY di Cloudflare.',
  'configured':'Server terkonfigurasi. Uji login dan koneksi AI dengan rekaman percobaan.'
 };
 const statusMessage=(value)=>value?.ready===true?explanations.configured:
  explanations[String(value?.reason||'')]||'Server belum siap. Periksa konfigurasi Cloudflare.';
 async function check(){
  let response;
  try {response=await fetch('/api/transcribe-status',{method:'GET',cache:'no-store',credentials:'omit',redirect:'error',headers:{Accept:'application/json'},signal:AbortSignal.timeout(7000)});}
  catch {throw Error('Tidak bisa menjangkau layanan Cloudflare. Periksa koneksi internet dan alamat situs.');}
  if(response.status===404)throw Error('Endpoint Cloudflare Pages Functions tidak ditemukan (404). Pastikan folder functions/ ikut terdeploy.');
  if(!response.ok)throw Error('Pemeriksaan server gagal (HTTP '+response.status+').');
  if(!response.headers.get('content-type')?.includes('application/json'))
   throw Error('Endpoint server tidak aktif: situs mengembalikan HTML, bukan JSON. Periksa deployment Cloudflare Pages Functions.');
  const result=await response.json().catch(()=>null);
  if(!result||typeof result.live?.ready!=='boolean'||typeof result.upload?.ready!=='boolean')
   throw Error('Pemeriksaan layanan menerima data server tidak valid.');
  return result;
 }
 root.SIPETAK_TRANSCRIBE_SERVICE={check,statusMessage};
})(typeof window!=='undefined'?window:globalThis);
