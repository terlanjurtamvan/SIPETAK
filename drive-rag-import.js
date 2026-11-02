"use strict";
/* SIPETAK: import PDF Drive via authenticated Cloudflare Pages proxy.
 * This does NOT access private Google Drive without Google OAuth.
 * Google sharing link alone is not permission for this web app.
 */
(function(root){
 function fileId(url){
  try{
   const u=new URL(String(url||'').trim());
   if(u.protocol!=='https:'||!['drive.google.com','docs.google.com'].includes(u.hostname))return null;
   const p=u.pathname;
   const hit=p.match(/^\/(?:file\/d|document\/d)\/([a-zA-Z0-9_-]{20,120})(?:\/|$)/);
   const id=hit?.[1]||(p==='/uc'||p==='/open'?u.searchParams.get('id'):null);
   return /^[a-zA-Z0-9_-]{20,120}$/.test(id||'')?id:null;
  }catch{return null;}
 }
 async function getPdf(url){
  const id=fileId(url);
  if(!id)throw Error('Tautan Drive tidak dikenali. Gunakan URL file PDF dari drive.google.com/file/d/...');
  const token=await root.SIPETAK_SB_AI_TOKEN?.();
  if(!token)throw Error('Login Supabase diperlukan untuk mengambil PDF dari Drive melalui SIPETAK.');
  let response;
  try{response=await fetch('/api/drive-pdf?id='+encodeURIComponent(id),{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/pdf'},credentials:'same-origin',cache:'no-store'});}
  catch{throw Error('Koneksi ke layanan impor Drive gagal. Periksa jaringan atau unduh PDF lalu impor dari perangkat.');}
  if(!response.ok){let body;try{body=await response.json()}catch{};
   const msg=typeof body?.error==='string'?body.error:'Layanan impor Drive belum siap (HTTP '+response.status+').';
   throw Error(msg);
  }
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength<20||bytes.byteLength>10*1024*1024)throw Error('PDF Drive kosong atau melebihi batas 10 MB.');
  const first=new Uint8Array(bytes,0,Math.min(5,bytes.byteLength));
  if(String.fromCharCode(...first)!=='%PDF-')throw Error('File Drive bukan PDF atau file tidak dapat diunduh.');
  return new File([bytes],'dokumen-drive.pdf',{type:'application/pdf'});
 }
 root.SIPETAK_DRIVE_RAG={fileId,getPdf};
 if(typeof module!=='undefined'&&module.exports)module.exports={fileId};
})(typeof window!=='undefined'?window:globalThis);
