/* Cloudflare Pages Function: authenticated, streaming public-file-only Drive PDF bridge.
 * Does not save bytes or logs content. Requires an authenticated SIPETAK Supabase user.
 * Never accesses private Google Drive. OAuth needed for private Drive integration.
 */
const MAX_BYTES=10*1024*1024;
const GOOGLE_HOSTS=new Set(['drive.google.com','drive.usercontent.google.com']);
const SUPABASE_URL_FALLBACK='https://cnaveitgtodqtahzsnqf.supabase.co';
// Publishable key is public (the same value is in SIPETAK index.html). Not a service-role key.
const PUBLIC_KEY_FALLBACK='sb_publishable_efG2vuqp1UEcz6vrtArPpQ_rAdnJFAk';
function json(status,error){return new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function safeGoogle(url){try{const x=new URL(url);return x.protocol==='https:'&&GOOGLE_HOSTS.has(x.hostname)&&!x.username&&!x.password&&!x.port;}catch{return false;}}
export async function onRequestGet({request,env}){
 const url=new URL(request.url),id=url.searchParams.get('id');
 if(!/^[a-zA-Z0-9_-]{20,120}$/.test(id||''))return json(400,'ID file Drive tidak valid.');
 const auth=request.headers.get('Authorization')||'';
 if(!/^Bearer\s+\S{20,}$/.test(auth))return json(401,'Login Supabase SIPETAK diperlukan.');
 const sbUrl=String(env?.SUPABASE_URL||SUPABASE_URL_FALLBACK).replace(/\/$/,'');
 const sbKey=String(env?.SUPABASE_PUBLISHABLE_KEY||PUBLIC_KEY_FALLBACK);
 try{
  const login=await fetch(sbUrl+'/auth/v1/user',{headers:{Authorization:auth,apikey:sbKey,Accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if(!login.ok)return json(401,'Sesi Supabase tidak valid. Masuk kembali.');
  const currentUser=await login.json();
  if(!currentUser?.id)return json(401,'Tidak dapat memverifikasi identitas pengguna.');
 }catch{return json(503,'Layanan autentikasi tidak dapat dijangkau. Coba unggah PDF langsung.');}
 let target='https://drive.google.com/uc?export=download&id='+encodeURIComponent(id);
 try{
  for(let hop=0;hop<4;hop++){
   if(!safeGoogle(target))return json(403,'Pengalihan Drive tidak diizinkan.');
   const resp=await fetch(target,{method:'GET',redirect:'manual',headers:{Accept:'application/pdf,application/octet-stream'},signal:AbortSignal.timeout(20000)});
   if([301,302,303,307,308].includes(resp.status)){
    const location=resp.headers.get('Location');if(!location)return json(502,'Respons Drive tidak memiliki alamat unduhan.');
    target=new URL(location,target).toString();continue;
   }
   if(!resp.ok)return json(422,'Google Drive tidak mengizinkan file diunduh. Gunakan unggah PDF dari perangkat.');
   const size=Number(resp.headers.get('Content-Length')||0);
   if(size>MAX_BYTES)return json(413,'PDF Drive lebih besar dari 10 MB.');
   const contentType=resp.headers.get('Content-Type')||'';
   if(/text\/html|application\/json/i.test(contentType))return json(422,'Drive menampilkan halaman login atau konfirmasi, bukan PDF. File privat memerlukan OAuth; unduh ke perangkat lalu impor.');
   const reader=resp.body?.getReader();if(!reader)return json(502,'Gagal membaca respons Drive.');
   const chunks=[];let total=0;
   while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel();return json(413,'PDF Drive lebih besar dari 10 MB.');}chunks.push(value);}
   if(total<20)return json(422,'Dokumen Drive kosong atau tidak dapat diunduh.');
   const out=new Uint8Array(total);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.byteLength;}
   if(String.fromCharCode(...out.slice(0,5))!=='%PDF-')return json(422,'Drive tidak mengembalikan berkas PDF. Unduh PDF ke perangkat lalu impor.');
   return new Response(out,{headers:{'Content-Type':'application/pdf','Content-Length':String(total),'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Content-Disposition':'attachment; filename="dokumen-drive.pdf"'}});
  }
  return json(422,'Google Drive terlalu banyak mengalihkan permintaan. Gunakan unggah PDF lokal.');
 }catch{return json(502,'Impor Drive gagal. Periksa bahwa file dapat diunduh atau gunakan unggah PDF lokal.');}
}
