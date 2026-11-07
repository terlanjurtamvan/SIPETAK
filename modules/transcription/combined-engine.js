'use strict';
/** SIPETAK recording + browser speech recognition (best effort, no SIPETAK server).
 * Starts both microphone consumers from the same user gesture. Safari/iOS can mute
 * getUserMedia when SpeechRecognition begins; track mute is reported, never hidden.
 * No raw audio is persisted or transmitted by this module. Browser dictation can
 * use a third-party speech service; caller must obtain informed consent.
 */
(function(root){
 function speechConstructor(){return root.SpeechRecognition||root.webkitSpeechRecognition||null;}
 function supported(){return !!speechConstructor()&&!!root.SIPETAK_RECORDER?.start;}
 function start({onText=()=>{},onState=()=>{},onError=()=>{},onFinished=()=>{},maxBytes,lang='id-ID'}={}){
  const Speech=speechConstructor();
  if(!Speech)throw Error('Pengenal suara browser tidak tersedia. Untuk iPhone, coba Safari terbaru; audio masih bisa direkam terpisah.');
  if(!root.SIPETAK_RECORDER?.start)throw Error('Mesin perekaman WAV belum dimuat. Muat ulang SIPETAK.');
  if(root.isSecureContext===false)throw Error('Akses mikrofon memerlukan HTTPS.');
  let stopped=false,aborted=false,ended=false,muted=false,hadText=false,lastText='',lastError='',restarts=0,stopTimer=null,recognizer=null,recorder=null;
  let committed='',parts=[];
  const tracks=[];
  function publish(text){if(stopped)return;lastText=text;hadText=!!text;onText(text);}
  function stopSpeech(){
   if(stopTimer){clearTimeout(stopTimer);stopTimer=null;}
   const active=recognizer;recognizer=null;
   if(active){try{active.stop();}catch{try{active.abort?.();}catch{}}}
  }
  function beginSpeech(){
   if(stopped||lastError)return;
   const instance=new Speech();recognizer=instance;parts=[];
   instance.lang=lang;instance.interimResults=true;instance.continuous=true;instance.maxAlternatives=1;
   instance.onstart=()=>{if(recognizer===instance)onState('speech-started');};
   instance.onresult=event=>{
    if(stopped||recognizer!==instance)return;
    for(let i=event.resultIndex;i<event.results.length;i++){
     parts[i]=String(event.results[i]?.[0]?.transcript||'').trim();
    }
    restarts=0;
    publish([committed,parts.filter(Boolean).join(' ')].filter(Boolean).join(' ').trim());
    onState('text-received');
   };
   instance.onerror=event=>{
    if(stopped||recognizer!==instance)return;
    const code=String(event?.error||'unknown');
    if(code!=='no-speech')lastError=code;
    const messages={
     'not-allowed':'Safari menolak izin dikte. Audio mungkin tetap direkam, tetapi teks langsung tidak berjalan.',
     'service-not-allowed':'Layanan pengenal suara browser tidak diizinkan. Audio tetap direkam bila mikrofon masih aktif.',
     'audio-capture':'Safari tidak mengizinkan perekam WAV dan dikte memakai mikrofon bersama. File audio bisa tidak lengkap.',
     'network':'Layanan dikte browser tidak tersambung; periksa internet. Audio tetap lokal.',
     'no-speech':'Tidak ada ucapan yang dikenali. Dekatkan mikrofon dan lanjut berbicara.',
     'language-not-supported':'Pengenalan bahasa Indonesia tidak tersedia pada browser ini.'
    };
    onError(messages[code]||`Dikte browser bermasalah (${code}). Audio tetap direkam bila didukung.`,code);
   };
   instance.onend=()=>{
    if(stopped||recognizer!==instance)return;
    committed=[committed,parts.filter(Boolean).join(' ')].filter(Boolean).join(' ').trim();parts=[];
    recognizer=null;
    if(lastError){onState('speech-unavailable');return;}
    if(restarts++<3){
     onState('speech-restarting');
     stopTimer=setTimeout(()=>{stopTimer=null;if(stopped)return;try{beginSpeech();}catch(e){lastError='restart-failed';onError('Dikte Safari tidak dapat dilanjutkan. Audio tetap direkam bila didukung.','restart-failed');}},450);
    }else {lastError='stopped';onError('Dikte browser berhenti berulang kali. Audio masih direkam; teks tidak lengkap.','stopped');}
   };
   instance.start(); // Must stay in user gesture when starting the first session.
  }
  let limitFile=null,limitError=null;
  function finishByLimit(file,error){
   if(stopped)return;
   stopped=true;ended=true;stopSpeech();
   limitFile=file;limitError=error;
   onFinished(file,error||null);
  }
  // Start Web Audio capture and browser dictation in the SAME synchronous tap.
  // Neither mode requires the SIPETAK transcribe API / Cloudflare D1 / OpenAI key.
  const ready=Promise.resolve(root.SIPETAK_RECORDER.start({forceWav:true,maxBytes,onLimit:finishByLimit})).then(session=>{
   recorder=session;
   for(const track of session.stream?.getAudioTracks?.()||[]){
    const onMute=()=>{if(stopped)return;muted=true;onError('Safari membisukan mikrofon perekam saat dikte aktif. Rekaman mungkin sunyi. Hentikan dan unduh hasil untuk memeriksa; mode gabungan tidak didukung pada perangkat ini.','mic-muted');};
    const onEnded=()=>{if(!stopped)onError('Mikrofon rekaman terputus. Hentikan dan periksa file audio.','mic-ended');};
    track.addEventListener?.('mute',onMute);track.addEventListener?.('ended',onEnded);
    tracks.push([track,onMute,onEnded]);
    if(track.muted)onMute();
   }
   if(aborted&&!ended)session.abort();
   onState('audio-ready');
   return session;
  },error=>{stopped=true;stopSpeech();onError('Perekaman WAV tidak dapat dimulai: '+(error?.message||'mikrofon gagal'),'record-failed');throw error;});
  // Keep the promise consumed even if the caller immediately leaves the screen.
  ready.catch(()=>{});
  try{beginSpeech();}
  catch(error){lastError='speech-start-failed';onError('Dikte tidak dapat dimulai: '+(error?.message||'kesalahan Safari')+'. Audio tetap direkam jika tersedia.','speech-start-failed');}
  onState('starting');
  async function stop(){
   if(ended)return limitFile;
   stopped=true;stopSpeech();
   const session=await ready;
   if(ended)return limitFile;
   ended=true;
   for(const [track,onMute,onEnded] of tracks){track.removeEventListener?.('mute',onMute);track.removeEventListener?.('ended',onEnded);}
   const file=await session.stop();
   onFinished(file,null);
   return file;
  }
  function abort(){stopped=true;aborted=true;stopSpeech();
   for(const [track,onMute,onEnded] of tracks){track.removeEventListener?.('mute',onMute);track.removeEventListener?.('ended',onEnded);}
   if(recorder)recorder.abort();else ready.then(session=>session.abort()).catch(()=>{});
  }
  return {ready,stop,abort,get state(){return stopped?'inactive':'recording';},get text(){return lastText;},get hasText(){return hadText;},get audioMuted(){return muted;},get speechError(){return lastError;},get speechAvailable(){return !lastError;}};
 }
 root.SIPETAK_COMBINED_ENGINE={start,supported};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.SIPETAK_COMBINED_ENGINE;
})(typeof window!=='undefined'?window:globalThis);
