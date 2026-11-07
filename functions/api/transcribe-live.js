/* SIPETAK Cloudflare Pages: authenticated live transcription WebRTC SDP proxy.
 * Audio travels directly browser -> OpenAI WebRTC once SDP is negotiated.
 * Requires OPENAI_API_KEY, D1 TRANSCRIBE_DB, and TRANSCRIBE_LIVE_ENABLED=true.
 * Quota counts session starts; backend-level session duration caps must be
 * configured/monitored before broad production rollout.
 */
const SB_URL='https://cnaveitgtodqtahzsnqf.supabase.co';
const SB_PUBLIC_KEY='sb_publishable_efG2vuqp1UEcz6vrtArPpQ_rAdnJFAk';
function json(status,error){return new Response(JSON.stringify({error}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function positiveLimit(value,fallback,max){const n=Number(value);return Number.isInteger(n)&&n>0&&n<=max?n:fallback;}
const QUOTA_SQL=`INSERT INTO transcription_quota (quota_key, quota_date, used)
 VALUES (?, ?, 1) ON CONFLICT(quota_key,quota_date) DO UPDATE SET used=used+1
 WHERE used < ? RETURNING used`;
async function charge(db,key,date,limit){return !!await db.prepare(QUOTA_SQL).bind(key,date,limit).first();}
export async function onRequestPost({request,env}){
 const from=request.headers.get('Origin');
 if(from&&from!==new URL(request.url).origin)return json(403,'Asal permintaan tidak diizinkan.');
 if(env?.TRANSCRIBE_LIVE_ENABLED!=='true')return json(503,'Transkripsi langsung belum diaktifkan pengelola SIPETAK.');
 if(!env?.OPENAI_API_KEY||!env?.TRANSCRIBE_DB?.prepare)return json(503,'Server belum memiliki kunci API dan kuota D1.');
 if(!['Umum','Internal'].includes(request.headers.get('X-Sipetak-Classification')))return json(403,'Klasifikasi rekaman tidak diizinkan untuk transkripsi eksternal.');
 if(!/^(application\/sdp|text\/plain)(\s*;.*)?$/i.test(request.headers.get('Content-Type')||''))return json(415,'SDP tidak valid.');
 if(Number(request.headers.get('Content-Length')||0)>70000)return json(413,'SDP terlalu besar.');
 const auth=request.headers.get('Authorization')||'';
 if(!/^Bearer\s+\S{20,}$/.test(auth))return json(401,'Login Supabase diperlukan.');
 let user;
 try{
  const url=String(env.SUPABASE_URL||SB_URL).replace(/\/+$/,'');
  if(new URL(url).protocol!=='https:')throw Error('URL');
  const resp=await fetch(url+'/auth/v1/user',{headers:{Authorization:auth,apikey:String(env.SUPABASE_PUBLISHABLE_KEY||SB_PUBLIC_KEY),Accept:'application/json'},signal:AbortSignal.timeout(9000)});
  if(!resp.ok)return json(401,'Sesi login tidak berlaku.');
  user=await resp.json();
  if(!/^[-a-zA-Z0-9_]{8,128}$/.test(String(user?.id||'')))return json(401,'Identitas akun tidak valid.');
 }catch{return json(503,'Verifikasi Supabase tidak tersedia.');}
 const allow=String(env.TRANSCRIBE_ALLOWED_USER_IDS||'').trim();
 if(allow&&!allow.split(',').map(x=>x.trim()).includes(user.id))return json(403,'Akun belum diizinkan memakai transkripsi.');
 // Controls remain in the user-facing UI; do not accept untrusted server-side
 // classification assertions in place of an actual institutional privacy policy.
 let sdp;
 try{sdp=await request.text();}catch{return json(400,'SDP gagal dibaca.');}
 if(sdp.length>70000||!sdp.startsWith('v=0')||!sdp.includes('m=audio'))return json(400,'SDP audio tidak valid.');
 const date=new Date().toISOString().slice(0,10);
 try{
  if(!await charge(env.TRANSCRIBE_DB,'live:all',date,positiveLimit(env.TRANSCRIBE_LIVE_GLOBAL_DAILY_LIMIT,60,1000)))return json(429,'Kuota sesi langsung instansi habis.');
  if(!await charge(env.TRANSCRIBE_DB,'live:user:'+user.id,date,positiveLimit(env.TRANSCRIBE_LIVE_DAILY_LIMIT,6,40)))return json(429,'Kuota sesi langsung akun hari ini habis.');
 }catch{return json(503,'Pembatas kuota belum siap.');}
 const session={type:'transcription',audio:{input:{
  format:{type:'audio/pcm',rate:24000},
  transcription:{model:'gpt-live-transcribe',languages:['id'],delay:'low',
   prompt:'Transkripsi bahasa Indonesia untuk rapat Sekretariat DPRD. Pertahankan isi asli, tanpa menambah keputusan.',
   keywords:['SIPETAK','Sekretariat DPRD','Raperda','Renstra','SKP','RHK','Sekwan']},
  // gpt-live-transcribe does not support server_vad; client commits audio turns explicitly.
  turn_detection:null
 }}};
 const form=new FormData();form.set('sdp',sdp);form.set('session',JSON.stringify(session));
 try{
  const response=await fetch('https://api.openai.com/v1/realtime/calls',{
   method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY},body:form,signal:AbortSignal.timeout(20000)
  });
  if(!response.ok)return json(response.status===429?429:502,response.status===429?'Kuota penyedia transkripsi habis.':'Gagal menghubungkan layanan transkripsi langsung.');
  const body=await response.text();
  if(!body.startsWith('v=0'))return json(502,'Jawaban koneksi audio tidak valid.');
  return new Response(body,{status:201,headers:{'Content-Type':'application/sdp','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}});
 }catch{return json(502,'Koneksi langsung ke layanan transkripsi gagal.');}
}
export function onRequestGet(){return json(405,'Gunakan POST.');}
