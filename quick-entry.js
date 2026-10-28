'use strict';
/* A single-task quick entry. These are suggestions, not verified official SKP/RHK mappings. */
(function(root){
  const RULES=[
    {category:'Disposisi Sekwan',test:/\b(disposisi|arahan sekwan|perintah sekretaris)\b/i},
    {category:'Agenda Sekwan',test:/\b(agenda sekwan|jadwal sekwan|briefing sekwan)\b/i},
    {category:'Raperda / DIM',test:/\b(raperda|perda|\bdim\b|inventarisasi masalah)\b/i},
    {category:'Telaahan kebijakan',test:/\b(telaah|kajian|analisis|kebijakan|dasar hukum)\b/i},
    {category:'Tindak lanjut rapat',test:/\b(tindak lanjut|tindaklanjut|hasil rapat)\b/i},
    {category:'Persidangan',test:/\b(rapat|paripurna|persidangan|risalah|notulen|bamus|bapemperda)\b/i},
    {category:'Dukungan Sekretaris DPRD',test:/\b(sekretaris dprd|sekwan|pimpinan)\b/i}
  ];
  function suggestCategory(text){const s=String(text||'');return RULES.find(x=>x.test.test(s))?.category||'Lainnya'}
  function toRecord(input,{year,date,now,id}){
    const title=String(input?.title||'').trim().replace(/\s+/g,' ');
    if(!title||title.length>180)throw Error('Uraian pekerjaan wajib diisi (maksimal 180 karakter).');
    const output=String(input?.output||'').trim();
    const done=input?.done==='yes';
    if(done&&!output)throw Error('Isi hasil pekerjaan sebelum menandai selesai.');
    const deadlineAt=String(input?.deadlineAt||'').trim();
    if(deadlineAt&&(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(deadlineAt)||!Number.isFinite(new Date(deadlineAt).getTime())))throw Error('Tenggat tidak valid.');
    const selectedCategory=String(input?.category||'auto');
    const category=selectedCategory==='auto'?suggestCategory(title):selectedCategory;
    return {id,title,output,deadlineAt,deadline:deadlineAt.slice(0,10),date,status:done?'Selesai':'Proses',
      category,source:String(input?.source||'').trim(),priority:'Normal',rhkId:String(input?.rhkId||''),ikiId:'',notes:'',
      performanceYear:year,createdAt:now,updatedAt:now,completedAt:done?now:null};
  }
  const api={suggestCategory,toRecord};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.SIPETAK_QUICK=api;
})(typeof window==='undefined'?globalThis:window);
