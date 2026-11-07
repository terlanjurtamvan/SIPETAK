'use strict';
/* SIPETAK microphone recording engine. Audio stays local until explicit transcription submission.
 * Safari/iOS uses short-lived PCM capture encoded as valid mono 16 kHz WAV, avoiding
 * fragmented MP4 playback failures. No raw audio is persisted or sent by this module.
 */
(function(root){
 const MAX_BYTES=20*1024*1024, WAV_RATE=16000;
 function iosDevice(nav=root.navigator||{}){
  return /iPad|iPhone|iPod/.test(nav.userAgent||'') || (nav.platform==='MacIntel'&&Number(nav.maxTouchPoints)>1);
 }
 function mimeChoice(){
  const candidates=['audio/mp4','audio/webm;codecs=opus','audio/webm'];
  return candidates.find(type=>root.MediaRecorder?.isTypeSupported?.(type))||'';
 }
 function wavFile(samples,length){
  const array=new ArrayBuffer(44+length*2),view=new DataView(array);
  function str(offset,text){for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));}
  str(0,'RIFF');view.setUint32(4,36+length*2,true);str(8,'WAVE');str(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,WAV_RATE,true);view.setUint32(28,WAV_RATE*2,true);
  view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,length*2,true);
  let ptr=44;
  for(const chunk of samples)for(let i=0;i<chunk.length;i++){
   const v=Math.max(-1,Math.min(1,chunk[i]));view.setInt16(ptr,v<0?v*32768:v*32767,true);ptr+=2;
  }
  return new root.File([array],`rekaman-sipetak-${Date.now()}.wav`,{type:'audio/wav'});
 }
 async function start({forceWav=false,maxBytes=MAX_BYTES,onLimit=()=>{}}={}){
  if(!root.isSecureContext||!root.navigator?.mediaDevices?.getUserMedia)throw Error('Mikrofon hanya tersedia melalui HTTPS dan browser yang mendukung izin rekaman.');
  const shouldWav=forceWav||iosDevice();
  const AudioContext=root.AudioContext||root.webkitAudioContext;
  let primedContext=null,primedResume=null;
  // Safari's Web Audio activation often needs to happen in the original tap gesture,
  // BEFORE the asynchronous microphone permission prompt finishes.
  if(shouldWav&&AudioContext){
   try{primedContext=new AudioContext();primedResume=Promise.resolve(primedContext.resume()).catch(()=>{});}
   catch{primedContext=null;}
  }
  let stream;
  try{stream=await root.navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});}
  catch(error){if(primedContext)await primedContext.close().catch(()=>{});throw error;}
  const cleanup=()=>{for(const track of stream.getTracks())try{track.stop();}catch{}};
  if(shouldWav){
   if(AudioContext){
    let context=primedContext,source,processor;
    try{
     if(!context)context=new AudioContext();
     if(primedResume)await primedResume;
     if(typeof context.createScriptProcessor!=='function')throw Error('Perekaman WAV tidak didukung di browser ini.');
     source=context.createMediaStreamSource(stream);processor=context.createScriptProcessor(4096,1,1);
     const rate=Number(context.sampleRate)/WAV_RATE;
     if(!Number.isFinite(rate)||rate<=0)throw Error('Kecepatan sampel mikrofon tidak valid.');
     const collected=[];let length=0,cursor=0,closed=false,stopping=false,audioPeak=0;
     const maxSamples=Math.floor((maxBytes-44)/2);
     let session;
     processor.onaudioprocess=(event)=>{
      if(closed)return;
      const input=event.inputBuffer.getChannelData(0),values=[];
      for(let p=cursor;p<input.length;p+=rate){
       if(length+values.length>=maxSamples)break;
       values.push(input[Math.min(input.length-1,Math.floor(p))]);
      }
      // Maintain phase across callback boundaries so audio stays at ~16 kHz.
      const produced=values.length;
      cursor+=produced*rate-input.length;
      if(cursor<0)cursor=0;
      if(produced){const frame=Float32Array.from(values);collected.push(frame);length+=produced;
       for(let k=0;k<frame.length;k++){const value=Math.abs(frame[k]);if(value>audioPeak)audioPeak=value;}}
      if(length>=maxSamples&&!stopping){
       stopping=true;
       Promise.resolve().then(async()=>{
        try{const file=await session.stop();onLimit(file);}catch(e){onLimit(null,e);}
       });
      }
     };
     source.connect(processor);processor.connect(context.destination);
     if(context.state!=='running')await context.resume();
     if(context.state!=='running')throw Error('Audio iPhone belum aktif. Tekan Mulai rekam kembali setelah memberi izin mikrofon.');
     session={mode:'wav',type:'audio/wav',stream,get audioPeak(){return audioPeak;},get durationSeconds(){return length/WAV_RATE;},get state(){return closed?'inactive':'recording';},
      async stop(){if(closed)throw Error('Perekaman sudah dihentikan.');closed=true;processor.onaudioprocess=null;
       try{processor.disconnect();source.disconnect();}catch{}cleanup();
       await context.close().catch(()=>{});
       if(length<1600)throw Error('Rekaman kurang dari 0,1 detik. Coba lagi dan tunggu beberapa detik sebelum menekan Hentikan.');
       return wavFile(collected,length);
      },
      abort(){if(closed)return;closed=true;processor.onaudioprocess=null;
       try{processor.disconnect();source.disconnect();}catch{}cleanup();context.close().catch(()=>{});
      }};
     return session;
    }catch(err){
     try{processor?.disconnect();source?.disconnect();await context?.close();}catch{}
     if(forceWav){cleanup();throw err;}
     // If the Web Audio API is unavailable, let MediaRecorder handle this device.
    }
   }else if(forceWav){cleanup();throw Error('Browser tidak menyediakan perekaman WAV. Coba Safari terbaru atau unggah dari Memo Suara.');}
  }
  const MR=root.MediaRecorder;
  if(!MR){cleanup();throw Error('Browser tidak memiliki perekam audio. Gunakan unggah berkas rekaman.');}
  let media;
  const mime=mimeChoice();
  try{media=new MR(stream,mime?{mimeType:mime}:undefined);}catch(err){cleanup();throw Error('Browser tidak dapat memulai format rekaman: '+(err?.message||'tidak didukung'));}
  const chunks=[];let completed=false,aborted=false;
  let resolveStop,rejectStop;
  const ended=new Promise((resolve,reject)=>{resolveStop=resolve;rejectStop=reject;});
  // Promise is consumed by stop(); prevent an unhandled-rejection warning if the microphone fails first.
  ended.catch(()=>{});
  const clear=()=>{cleanup();};
  media.addEventListener('dataavailable',event=>{if(event.data?.size)chunks.push(event.data);});
  media.addEventListener('error',event=>{if(completed)return;completed=true;clear();rejectStop(Error('Perekaman audio gagal: '+(event.error?.message||'kesalahan browser')));});
  media.addEventListener('stop',()=>{
   if(completed)return;completed=true;clear();
   if(aborted){rejectStop(Error('Rekaman dibatalkan.'));return;}
   const actualType=media.mimeType||mime||chunks[0]?.type||'audio/webm';
   const ext=/mp4/i.test(actualType)?'m4a':'webm';
   const file=new root.File(chunks,`rekaman-sipetak-${Date.now()}.${ext}`,{type:actualType});
   if(file.size<256)rejectStop(Error('Perekam tidak menghasilkan audio yang cukup. Rekam sedikitnya beberapa detik.'));
   else resolveStop(file);
  },{once:true});
  try{
   // CRITICAL for Safari: do not use a 1000ms timeslice. Encode a continuous
   // MP4 recording and receive the complete Blob only on stop.
   media.start();
  }catch(err){clear();ended.catch(()=>{});throw Error('Gagal memulai rekaman: '+(err?.message||'format tidak didukung'));}
  return {mode:'mediarecorder',type:media.mimeType||mime,stream,get state(){return media.state;},
   stop(){if(media.state==='recording')media.stop();return ended;},
   abort(){aborted=true;clear();if(media.state==='recording')media.stop();}};
 }
 root.SIPETAK_RECORDER={start,iosDevice,mimeChoice,MAX_BYTES,WAV_RATE};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.SIPETAK_RECORDER;
})(typeof window!=='undefined'?window:globalThis);
