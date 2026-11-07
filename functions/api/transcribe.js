/* Cloudflare Pages Function: same-origin authenticated speech-to-text.
 * REQUIRE secret OPENAI_API_KEY, env TRANSCRIBE_ENABLED=true and D1 TRANSCRIBE_DB.
 * Fail closed without an atomic per-user & project quota; never persist raw audio or transcript.
 */
const MAX_AUDIO_BYTES=20*1024*1024;
const SB_URL='https://cnaveitgtodqtahzsnqf.supabase.co';
const SB_PUBLIC_KEY='sb_publishable_efG2vuqp1UEcz6vrtArPpQ_rAdnJFAk';
const EXT=/\.(mp3|mp4|mpeg|mpga|m4a|wav|webm)$/i;
function reply(status,payload){return new Response(JSON.stringify(payload),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});}
function positiveLimit(value,fallback,max){const n=Number(value);return Number.isInteger(n)&&n>0&&n<=max?n:fallback;}
// A single SQLite UPSERT is atomic. D1 is used to cap billable requests across instances.
const QUOTA_SQL=`INSERT INTO transcription_quota (quota_key, quota_date, used)
  VALUES (?, ?, 1)
  ON CONFLICT(quota_key,quota_date) DO UPDATE SET used=used+1
  WHERE used < ?
  RETURNING used`;
async function debit(db,key,date,limit){const result=await db.prepare(QUOTA_SQL).bind(key,date,limit).first();return !!result;}
export async function onRequestPost({request,env}){
 const origin=new URL(request.url).origin,from=request.headers.get('Origin');
 if(from&&from!==origin)return reply(403,{error:'Permintaan berasal dari situs yang tidak diizinkan.'});
 if(env?.TRANSCRIBE_ENABLED!=='true')return reply(503,{error:'Transkripsi server belum diaktifkan pengelola SIPETAK.'});
 if(!env?.OPENAI_API_KEY||!env?.TRANSCRIBE_DB?.prepare)return reply(503,{error:'Server transkripsi belum memiliki secret API atau pembatas kuota D1.'});
 const size=Number(request.headers.get('Content-Length')||0);
 if(size>MAX_AUDIO_BYTES+1048576)return reply(413,{error:'Rekaman maksimal 20 MB.'});
 const auth=request.headers.get('Authorization')||'';
 if(!/^Bearer\s+\S{20,}$/.test(auth))return reply(401,{error:'Login Supabase diperlukan.'});
 let user;
 try{
  const url=String(env.SUPABASE_URL||SB_URL).replace(/\/+$/,'');
  const cfg=new URL(url);if(cfg.protocol!=='https:')throw Error('Supabase URL tidak valid');
  const sb=await fetch(url+'/auth/v1/user',{headers:{Authorization:auth,apikey:String(env.SUPABASE_PUBLISHABLE_KEY||SB_PUBLIC_KEY),Accept:'application/json'},signal:AbortSignal.timeout(9000)});
  if(!sb.ok)return reply(401,{error:'Sesi Supabase tidak valid. Login kembali.'});
  user=await sb.json();
  if(!user?.id||!/^[-a-zA-Z0-9_]{8,128}$/.test(user.id))return reply(401,{error:'Identitas akun belum tervalidasi.'});
 }catch{return reply(503,{error:'Verifikasi sesi Supabase sedang tidak tersedia.'});}
 const whitelist=String(env.TRANSCRIBE_ALLOWED_USER_IDS||'').trim();
 if(whitelist&&!whitelist.split(',').map(x=>x.trim()).includes(user.id))return reply(403,{error:'Akun ini belum diizinkan menggunakan transkripsi.'});
 const ct=request.headers.get('Content-Type')||'';
 if(!/^multipart\/form-data\s*;/i.test(ct))return reply(415,{error:'Gunakan unggahan multipart/form-data.'});
 let payload;
 try{payload=await request.formData();}catch{return reply(400,{error:'Format unggahan tidak dapat dibaca.'});}
 const file=payload.get('file'),classification=payload.get('classification');
 if(!file||typeof file.name!=='string'||typeof file.size!=='number'||file.size<1||file.size>MAX_AUDIO_BYTES)return reply(413,{error:'Pilih audio berukuran 1 byte hingga 20 MB.'});
 if(!EXT.test(file.name)||file.name.length>180||!/^(audio\/|video\/mp4$|application\/octet-stream$)/i.test(file.type||'application/octet-stream'))return reply(415,{error:'Berkas audio tidak didukung. Gunakan MP3, M4A, MP4, WAV, atau WEBM.'});
 if(classification!=='Umum'&&classification!=='Internal')return reply(403,{error:'Klasifikasi ini tidak boleh dikirim ke layanan eksternal.'});
 const date=new Date().toISOString().slice(0,10);
 const perUser=positiveLimit(env.TRANSCRIBE_DAILY_LIMIT,8,30),allUsers=positiveLimit(env.TRANSCRIBE_GLOBAL_DAILY_LIMIT,200,1000);
 try{
  // Global budget first. An unsuccessful subsequent quota check can consume one global slot (fail-safe).
  if(!await debit(env.TRANSCRIBE_DB,'all',date,allUsers))return reply(429,{error:'Kuota transkripsi instansi hari ini telah habis.'});
  if(!await debit(env.TRANSCRIBE_DB,'user:'+user.id,date,perUser))return reply(429,{error:'Kuota transkripsi akun hari ini telah habis.'});
 }catch{return reply(503,{error:'Pembatas kuota belum siap. Hubungi pengelola SIPETAK.'});}
 try{
  const form=new FormData();form.append('model','gpt-transcribe');form.append('file',file,file.name);
  form.append('prompt','Bahasa Indonesia. Konteks administrasi rapat Sekretariat DPRD, persidangan, Raperda, DIM, Sekwan, SKP, RHK, dan risalah. Pertahankan yang benar-benar diucapkan, jangan menambah keputusan atau nama.');
  const res=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY},body:form,signal:AbortSignal.timeout(90000)});
  if(!res.ok){
   if(res.status===429)return reply(503,{error:'Penyedia transkripsi sedang membatasi layanan. Ulangi nanti.'});
   return reply(502,{error:'Penyedia transkripsi gagal memproses rekaman. Periksa format atau durasi audio.'});
  }
  const out=await res.json();const text=typeof out?.text==='string'?out.text.trim():'';
  if(!text||text.length>80000)return reply(422,{error:'Transkrip kosong atau terlalu panjang. Periksa kualitas rekaman.'});
  return reply(200,{text,model:'gpt-transcribe',status:'draft-needs-review'});
 }catch{return reply(502,{error:'Transkripsi gagal atau koneksi ke penyedia terputus. Rekaman tidak disimpan di server SIPETAK.'});}
}
export function onRequestGet(){return reply(405,{error:'Gunakan POST untuk mengirim rekaman.'});}
