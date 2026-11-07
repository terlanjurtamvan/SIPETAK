'use strict';
/* SIPETAK live speech-to-text over WebRTC. SDP is exchanged with the same-origin
 * Cloudflare Pages Function; the browser never receives the OpenAI API key.
 * Audio recording is managed separately and remains local to the browser.
 */
(function(root){
 const LIMIT=80000;
 function create({onText=()=>{},onStatus=()=>{},onError=()=>{}}={}){
  const entries=new Map();let peer=null,channel=null,stopped=false,established=false;
  function combined(){return Array.from(entries.values()).map(v=>v.final||v.partial).filter(Boolean).join('\n').slice(0,LIMIT);}
  function update(){onText(combined(),{complete:[...entries.values()].filter(v=>v.final).length,partial:[...entries.values()].some(v=>!!v.partial&&!v.final)});}
  function accept(event){
   if(stopped||!event||typeof event!=='object')return;
   const id=typeof event.item_id==='string'?event.item_id:'';
   if(event.type==='conversation.item.input_audio_transcription.delta'&&id&&typeof event.delta==='string'){
    if(!entries.has(id))entries.set(id,{partial:'',final:''});
    const item=entries.get(id);if(item.final)return;
    item.partial=(item.partial+event.delta).slice(0,LIMIT);update();
   }else if(event.type==='conversation.item.input_audio_transcription.completed'&&id&&typeof event.transcript==='string'){
    if(!entries.has(id))entries.set(id,{partial:'',final:''});
    const item=entries.get(id);item.final=event.transcript.trim().slice(0,LIMIT);item.partial='';update();
   }else if(event.type==='error'){
    onError(String(event.error?.message||'Layanan transkripsi langsung mengalami kesalahan.').slice(0,200));
   }else if(event.type==='session.updated'||event.type==='session.created'){
    onStatus('Tersambung. Teks akan muncul saat Anda berbicara.');
   }
  }
  async function connect({stream,token,classification}){
   if(!stream?.getAudioTracks?.().length)throw Error('Tidak ada jalur audio mikrofon.');
   if(!root.RTCPeerConnection)throw Error('Browser ini belum mendukung WebRTC untuk transkripsi langsung.');
   const p=new root.RTCPeerConnection();peer=p;
   p.addTrack(stream.getAudioTracks()[0],stream);
   channel=p.createDataChannel('oai-events');
   channel.onmessage=e=>{try{accept(JSON.parse(e.data));}catch{}};
   channel.onerror=()=>onError('Koneksi teks langsung bermasalah. Simpan rekaman audio sebelum meninggalkan halaman.');
   p.onconnectionstatechange=()=>{
    if(stopped)return;
    if(p.connectionState==='connected'){established=true;onStatus('Merekam dan mengetik langsung. Berbicaralah dengan jelas.');}
    else if(['failed','closed','disconnected'].includes(p.connectionState)&&established)onError('Koneksi transkripsi terputus. Rekaman lokal tetap berjalan; Anda dapat memprosesnya setelah berhenti.');
   };
   const offer=await p.createOffer();await p.setLocalDescription(offer);
   if(stopped)throw Error('Transkripsi langsung dibatalkan.');
   const send=async auth=>fetch('/api/transcribe-live',{
    method:'POST',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/sdp','X-Sipetak-Classification':classification||''},
    body:offer.sdp,cache:'no-store',credentials:'omit',redirect:'error'
   });
   let r=await send(token);
   if(r.status===401&&typeof root.SIPETAK_SB_AI_TOKEN==='function')r=await send(await root.SIPETAK_SB_AI_TOKEN(true));
   if(!r.ok){const error=await r.json().catch(()=>({}));throw Error(error.error||'Layanan teks langsung belum aktif. Periksa Cloudflare dan kuota.');}
   const answer=await r.text();if(!answer.startsWith('v=0'))throw Error('Server tidak mengembalikan jawaban koneksi audio yang valid.');
   if(stopped)throw Error('Transkripsi langsung dibatalkan.');
   await p.setRemoteDescription({type:'answer',sdp:answer});
   onStatus('Mikrofon terhubung. Teks muncul ketika suara terdeteksi.');
  }
  async function stop({graceMs=1300}={}){
   if(stopped)return combined();
   // Briefly allow the final VAD transcript to arrive after recording stops.
   if(graceMs>0)await new Promise(resolve=>setTimeout(resolve,Math.min(graceMs,2000)));
   stopped=true;
   try{channel?.close();}catch{}
   try{peer?.close();}catch{}
   peer=null;channel=null;
   return combined();
  }
  function abort(){stopped=true;try{channel?.close();}catch{}try{peer?.close();}catch{}peer=null;channel=null;}
  return {connect,accept,stop,abort,combined,get established(){return established;}};
 }
 root.SIPETAK_LIVE_ENGINE={create};
})(typeof window!=='undefined'?window:globalThis);
