'use strict';
/* SIPETAK lifecycle rules: pure, testable; NOT a legal/e-signature approval engine. */
(function(root){
 const STAGES=['diterima','dikerjakan','untuk_reviu','dikembalikan','terverifikasi_internal','dilaporkan','diarsipkan'];
 const NEXT={diterima:['dikerjakan'],dikerjakan:['untuk_reviu'],untuk_reviu:['dikembalikan','terverifikasi_internal'],dikembalikan:['dikerjakan'],terverifikasi_internal:['dilaporkan','dikembalikan'],dilaporkan:['diarsipkan'],diarsipkan:[]};
 const COLLECTIONS={task:'tasks',review:'reviews',directive:'directives',meeting:'meetings',dim:'dims'};
 function safeText(x){return String(x??'').trim()}
 function sourceOf(data,kind,id){return (data[COLLECTIONS[kind]]||[]).find(x=>x.id===id)||null}
 function evidenceOf(data,id){return (data.evidence||[]).find(x=>x.id===id)||null}
 function evidenceReady(x){return !!(x&&safeText(x.title)&&safeText(x.date)&& (x.file?.data||safeText(x.description)))}
 function recordValid(data,r){const s=sourceOf(data,r.sourceKind,r.sourceId);return s&&Number(s.performanceYear)===Number(r.performanceYear)}
 function duplicateSource(data,kind,id){return (data.lifecycle||[]).some(x=>x.sourceKind===kind&&x.sourceId===id)}
 function evaluate(data,record,target,details={}){
   const errors=[];
   if(!STAGES.includes(target)||!(NEXT[record.status]||[]).includes(target))errors.push('Transisi tahap tidak diperbolehkan.');
   if(!recordValid(data,record))errors.push('Sumber pekerjaan hilang atau berasal dari tahun berbeda.');
   if((data.years||[]).some(y=>Number(y.year)===Number(record.performanceYear)&&y.status==='arsip'))errors.push('Tahun telah diarsipkan.');
   const note=safeText(details.note);
   if(target==='untuk_reviu'&&note.length<8)errors.push('Jelaskan keluaran yang akan diperiksa (minimal 8 karakter).');
   if(target==='terverifikasi_internal'){
     if(safeText(details.reviewer).length<3)errors.push('Isi nama pemeriksa internal (minimal 3 karakter).');
     const ids=[...new Set(record.evidenceIds||[])];
     if(!ids.length||!ids.some(id=>{const e=evidenceOf(data,id);return e&&Number(e.performanceYear)===Number(record.performanceYear)&&evidenceReady(e)}))errors.push('Tautkan minimal satu bukti dengan tanggal, judul, dan isi/lokasi dokumen.');
   }
   if(target==='dilaporkan'&&safeText(details.reportRef).length<4)errors.push('Isi referensi laporan/rekap (minimal 4 karakter).');
   if(target==='diarsipkan'&&note.length<8)errors.push('Catat lokasi arsip atau alasan penutupan (minimal 8 karakter).');
   return errors;
 }
 function evidenceChoices(data,year){return (data.evidence||[]).filter(x=>Number(x.performanceYear)===Number(year))}
 function orphaned(data,year){const problems=[];for(const r of data.lifecycle||[]){if(year&&Number(r.performanceYear)!==Number(year))continue;
   if(!recordValid(data,r))problems.push(`${r.id}: sumber hilang/beda tahun`);
   for(const eid of r.evidenceIds||[]){const e=evidenceOf(data,eid);if(!e||Number(e.performanceYear)!==Number(r.performanceYear))problems.push(`${r.id}: bukti ${eid} hilang/beda tahun`)}
 }return problems}
 const api={STAGES,NEXT,COLLECTIONS,safeText,sourceOf,evidenceOf,evidenceReady,recordValid,duplicateSource,evaluate,evidenceChoices,orphaned};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.SIPETAK_LIFECYCLE=api;
})(typeof window==='undefined'?globalThis:window);
