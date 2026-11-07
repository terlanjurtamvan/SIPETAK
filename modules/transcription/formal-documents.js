'use strict';
/* SIPETAK: notulen and risalah concepts from one transcript. No external calls; no invented facts. */
(function(root){
 const FIELDS=['date','meetingType','sessionYear','sessionPeriod','meetingNumber','agenda','nature','place','startTime','endTime','chair','secretary','notulis','attendees','invitees','summary','decisions','followup','signPlace'];
 const NAMES={date:'Tanggal rapat',meetingType:'Jenis rapat',sessionYear:'Tahun sidang',sessionPeriod:'Masa persidangan',meetingNumber:'Rapat ke-',agenda:'Acara rapat',nature:'Sifat rapat',place:'Tempat',startTime:'Jam mulai',endTime:'Jam selesai',chair:'Pimpinan rapat',secretary:'Sekretaris rapat',notulis:'Notulis',attendees:'Anggota/peserta hadir',invitees:'Undangan',summary:'Pokok pembahasan hasil pemeriksaan',decisions:'Rumusan keputusan/kesimpulan terverifikasi',followup:'Tindak lanjut/PIC/tenggat',signPlace:'Tempat penandatanganan'};
 function clean(value,max=4000){return String(value??'').replace(/\r\n?/g,'\n').replace(/\0/g,'').slice(0,max).trim();}
 function meta(input={}){const out={};for(const k of FIELDS)out[k]=clean(input[k],k==='summary'||k==='decisions'||k==='followup'||k==='attendees'||k==='invitees'?8000:250);return out;}
 function safe(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function val(s,placeholder='[belum diisi — perlu verifikasi]'){return clean(s)||placeholder;}
 function plainDate(ymd){const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(String(ymd||''));if(!m)return val(ymd);const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return d.getUTCFullYear()===+m[1]&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[3]?new Intl.DateTimeFormat('id-ID',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d):val(ymd);}
 function normalize(kind,options={}){
  if(kind!=='notulen'&&kind!=='risalah')throw Error('Jenis dokumen tidak dikenal.');
  const title=clean(options.title,160),transcript=clean(options.transcript,80001),details=meta(options.details);
  if(!title)throw Error('Isi nama kegiatan/agenda.');
  if(!transcript)throw Error('Transkrip masih kosong.');
  if(transcript.length>80000)throw Error('Transkrip melebihi batas aplikasi 80.000 karakter.');
  const classification=clean(options.classification,20)||'Internal';
  return {kind,title,transcript,details,classification,markers:sanitizeMarkers(options.markers)};
 }
 function sanitizeMarkers(items){
  if(!Array.isArray(items))return [];
  return items.slice(0,300).map(item=>({
   session:Math.min(999,Math.max(1,Math.floor(Number(item?.session)||1))),
   seconds:Math.min(43200,Math.max(0,Math.floor(Number(item?.seconds)||0))),
   speaker:clean(item?.speaker,90)
  })).filter(item=>item.speaker);
 }
 function markerTime(seconds){const sec=Math.max(0,Math.floor(seconds));return [Math.floor(sec/3600),Math.floor(sec%3600/60),sec%60].map(n=>String(n).padStart(2,'0')).join(':');}
 function markerText(markers){return markers.length?markers.map(m=>'Sesi '+m.session+' · '+markerTime(m.seconds)+' · '+m.speaker+' (ditandai manual)').join('\n'):'[Belum ada penanda pembicara manual.]';}
 function metadataLines(o){const d=o.details;return [
  ['Nama rapat',o.title],['Acara rapat',val(d.agenda,o.title)],['Hari, tanggal',plainDate(d.date)],['Jenis rapat',val(d.meetingType)],['Tahun sidang',val(d.sessionYear)],['Masa persidangan',val(d.sessionPeriod)],['Rapat ke-',val(d.meetingNumber)],['Sifat rapat',val(d.nature)],
  ['Pukul',d.startTime&&d.endTime?d.startTime+'–'+d.endTime+' WIB':val(d.startTime)+' s.d. '+val(d.endTime)],
  ['Tempat',val(d.place)],['Pimpinan rapat',val(d.chair)],['Sekretaris rapat',val(d.secretary)],
  ['Notulis',val(d.notulis)],['Anggota/peserta hadir',val(d.attendees,'[sesuai daftar hadir yang diverifikasi]')],
  ['Undangan yang hadir',val(d.invitees,'[sesuai daftar hadir/undangan yang diverifikasi]')],
  ['Klasifikasi',o.classification]];
 }
 function sections(o){const d=o.details;return o.kind==='notulen' ? [
  ['I. AGENDA RAPAT',val(d.agenda,o.title)],
  ['II. POKOK PEMBAHASAN',val(d.summary,'Petikan awal dari transkrip (belum diringkas/disetujui): '+o.transcript.slice(0,650)+(o.transcript.length>650?'…':'')+' [Periksa, kelompokkan menurut pokok persoalan sebelum disahkan.]')],
  ['III. KESIMPULAN / KEPUTUSAN RAPAT',val(d.decisions,'[Belum dicatat — wajib dikonfirmasi kepada pimpinan rapat.]')],
  ['IV. TINDAK LANJUT, PENANGGUNG JAWAB, DAN TENGGAT',val(d.followup,'[Belum dicatat — isi jika disepakati dalam rapat.]')],
  ['V. LAMPIRAN TRANSKRIP HASIL PENGENALAN SUARA',o.transcript],
  ['VI. PENANDA PEMBICARA DAN WAKTU (MANUAL)',markerText(o.markers)+'\nPenanda ini dibuat oleh notulis saat rapat, belum menjamin identitas suara atau batas kalimat. Cocokkan dengan audio asli.']
 ] : [
  ['I. PEMBUKAAN',`Rapat dibuka pukul ${val(d.startTime)}. Pimpinan rapat: ${val(d.chair)}. Keterangan kuorum: [perlu verifikasi sesuai jenis rapat dan daftar hadir].`],
  ['II. URAIAN JALANNYA RAPAT (TRANSKRIP KERJA)',`[Identitas pembicara dan penanda waktu perlu dicocokkan dengan rekaman asli. Teks di bawah belum dapat dianggap verbatim yang disahkan.]\n\n${o.transcript}`],
  ['II-A. PENANDA PEMBICARA / WAKTU (CATATAN MANUAL)',markerText(o.markers)+'\nCatatan waktu dihitung dari tombol rekam; bukan pengenalan identitas otomatis. Verifikasi terhadap audio asli.'],
  ['III. KESIMPULAN / KEPUTUSAN',val(d.decisions,'[Belum dicatat — wajib dicocokkan dengan hasil rapat resmi.]')],
  ['IV. TINDAK LANJUT',val(d.followup,'[Belum dicatat — isi jika disepakati dalam rapat.]')],
  ['V. PENUTUP',`Rapat ditutup pukul ${val(d.endTime)}. [Konfirmasi waktu penutupan dan pimpinan rapat.]`]
 ];}
 function makeText(kind,options){const o=normalize(kind,options),heading=kind==='notulen'?'NOTULEN RAPAT':'RISALAH RAPAT';const lines=[
  'PEMERINTAH KABUPATEN KAPUAS HULU','SEKRETARIAT DEWAN PERWAKILAN RAKYAT DAERAH',heading,'KONSEP — BELUM DIPERIKSA / BELUM DISAHKAN','',
  ...metadataLines(o).map(([k,v])=>k+': '+v),'',...sections(o).flatMap(([h,v])=>[h,v,'']),
  'PENANDATANGANAN — SETELAH VERIFIKASI','Tempat: '+val(o.details.signPlace,'[isi tempat]')+'; Tanggal: '+plainDate(o.details.date),
  'Pimpinan Rapat: '+val(o.details.chair,'[nama/jabatan/tanda tangan]'),
  'Notulis: '+val(o.details.notulis,'[nama/jabatan/tanda tangan]'),
  '', 'Catatan: Dokumen ini hanya konsep. Tidak ada keputusan, identitas pembicara, kuorum, atau tanda tangan yang ditetapkan otomatis. Sesuaikan dengan Tata Tertib DPRD dan tata naskah dinas yang berlaku.'
 ];return lines.join('\n');}
 const para=s=>safe(s).split(/\n/).map(x=>x||'&nbsp;').join('<br>');
 function makeHtml(kind,options){const o=normalize(kind,options);const title=kind==='notulen'?'NOTULEN RAPAT':'RISALAH RAPAT';
  const rows=metadataLines(o).map(([label,value])=>`<tr><th>${safe(label)}</th><td>${para(value)}</td></tr>`).join('');
  const bodies=sections(o).map(([label,value])=>`<section class="part"><h2>${safe(label)}</h2><div class="body-text">${para(value)}</div></section>`).join('');
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>${title} — ${safe(o.title)}</title><style>
  @page{size:A4;margin:23mm 22mm 22mm 28mm}body{font:11pt/1.5 Arial,Helvetica,sans-serif;color:#111;margin:0}header{text-align:center;border-bottom:3px solid #171717;padding-bottom:10px;margin-bottom:18px}header b{display:block;font-size:12.5pt;line-height:1.35}header small{display:block;font-size:9pt;margin-top:3px}h1{text-align:center;font-size:14pt;text-decoration:underline;margin:14px 0 2px}.draft{text-align:center;font-size:9pt;font-weight:bold;color:#9c2727;letter-spacing:.3px;margin-bottom:16px}table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:10pt}th,td{text-align:left;vertical-align:top;padding:3px 5px;word-wrap:break-word}th{width:32%;font-weight:normal}th:after{content:':' ;float:right}h2{font-size:11pt;margin:17px 0 7px}.body-text{white-space:normal;text-align:justify;overflow-wrap:anywhere}.part{break-inside:auto}.signature{margin-top:25px;display:flex;justify-content:space-between;gap:35px}.signature>div{width:46%;text-align:center}.signature .gap{height:66px}.notice{font-size:8.5pt;border-top:1px solid #999;padding-top:9px;margin-top:28px;color:#555}@media print{a{display:none}}
  </style></head><body><header><b>PEMERINTAH KABUPATEN KAPUAS HULU</b><b>SEKRETARIAT DEWAN PERWAKILAN RAKYAT DAERAH</b><small>[Kop, alamat, logo, dan penomoran disesuaikan dengan tata naskah dinas instansi]</small></header><h1>${title}</h1><div class="draft">KONSEP — BELUM DIPERIKSA / BELUM DISAHKAN</div><table>${rows}</table>${bodies}<div class="signature"><div>${safe(val(o.details.signPlace,'[tempat]'))}, ${safe(plainDate(o.details.date))}<br><b>Pimpinan Rapat</b><div class="gap"></div><u>${safe(val(o.details.chair,'[Nama lengkap]'))}</u></div><div>&nbsp;<br><b>Notulis</b><div class="gap"></div><u>${safe(val(o.details.notulis,'[Nama lengkap]'))}</u></div></div><div class="notice">Dokumen konsep untuk pemeriksaan. Transkrip dapat mengandung salah dengar. Kuorum, keputusan, identitas, dan tanda tangan tidak dibuat otomatis. Sesuaikan dengan Tata Tertib DPRD Kabupaten Kapuas Hulu dan tata naskah dinas setempat.</div></body></html>`;
 }
 function filename(kind,title){const kindName=kind==='notulen'?'Notulen':'Risalah';const safeName=clean(title,100).normalize('NFKD').replace(/[^a-zA-Z0-9-_ ]/g,'').trim().replace(/\s+/g,'-').slice(0,70)||'Rapat';return 'SIPETAK-'+kindName+'-'+safeName;}
 const api={FIELDS,NAMES,meta,sanitizeMarkers,markerTime,makeText,makeHtml,filename};root.SIPETAK_FORMAL_DOCS=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
