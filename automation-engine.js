'use strict';
/* SIPETAK 3.7 — deterministic automation over the ALREADY ENCRYPTED vault.
   No external API, inference, legal approval, or automatic SKP scoring.
   CommonJS export for offline regression testing. */
(function(root){
  const SOURCES={task:'tasks',review:'reviews',directive:'directives',meeting:'meetings',dim:'dims'};
  const STAGES=['diterima','dikerjakan','untuk_reviu','dikembalikan','terverifikasi_internal','dilaporkan','diarsipkan'];
  const kindNames={task:'Tugas',review:'Telaahan',directive:'Disposisi Sekwan',meeting:'Persidangan',dim:'DIM'};
  const s=x=>String(x??'').trim();
  const yr=x=>Number(x?.performanceYear)||0;
  const stamp=(date)=>new Date(date).toISOString();
  const records=(vault,year)=>Object.entries(SOURCES).flatMap(([kind,collection])=>(vault[collection]||[]).filter(x=>yr(x)===Number(year)).map(x=>({kind,record:x,collection})));
  const archived=(vault,year)=>(vault.years||[]).some(y=>Number(y.year)===Number(year)&&y.status==='arsip');
  const meaningful=e=>!!(e&&s(e.title)&&s(e.date)&&(e.file?.data||s(e.description)));
  const completed=(kind,x)=>kind==='task'||kind==='directive'||kind==='dim'?x.status==='Selesai':kind==='meeting'?x.minutesStatus==='Selesai':x.status==='Final internal';
  const progressing=(kind,x)=>kind==='meeting'?['Proses','Selesai'].includes(x.prepStatus)||['Proses','Selesai'].includes(x.minutesStatus):kind==='review'?['Untuk reviu','Final internal'].includes(x.status):['Proses','Selesai'].includes(x.status);
  const output=(kind,x)=>kind==='meeting'?s(x.result):kind==='review'?s(x.recommendation||x.analysis):s(x.output||x.result);
  function evidenceIds(vault,kind,x){
    const links=new Set();
    const lc=(vault.lifecycle||[]).find(l=>l.sourceKind===kind&&l.sourceId===x.id&&yr(l)===yr(x));
    for(const id of lc?.evidenceIds||[])links.add(id);
    for(const e of vault.evidence||[]){if(yr(e)!==yr(x))continue;
      if((kind==='task'&&e.taskId===x.id)||(['directive','meeting','dim'].includes(kind)&&e.workflowRefId===x.id))links.add(e.id);
    }
    return [...links];
  }
  function evidences(vault,kind,x){return evidenceIds(vault,kind,x).map(id=>(vault.evidence||[]).find(e=>e.id===id&&yr(e)===yr(x))).filter(Boolean)}
  // Safe, idempotent, write-only derivations. Never progress to review/verified/reported/archived.
  function reconcile(vault,{now=new Date().toISOString(),idFactory=null}={}){
    if(!vault)return {changed:false,events:[]};
    const makeId=idFactory||(()=> 'LC-'+(root.crypto?.randomUUID?.()||Math.random().toString(36).slice(2,14)).slice(0,12).toUpperCase());
    if(!Array.isArray(vault.lifecycle))vault.lifecycle=[];
    if(!Array.isArray(vault.automationEvents))vault.automationEvents=[];
    const events=[];const log=(type,kind,id)=>events.push({type,kind,id,at:now});
    for(const [kind,key] of Object.entries(SOURCES))for(const x of vault[key]||[]){
      const year=yr(x);if(!x?.id||!year||archived(vault,year))continue;
      let row=vault.lifecycle.find(r=>r.sourceKind===kind&&r.sourceId===x.id);
      if(!row){row={id:makeId(),sourceKind:kind,sourceId:x.id,title:x.title||x.perda||x.id,performanceYear:year,status:'diterima',evidenceIds:[],createdAt:now,updatedAt:now,history:[{stage:'diterima',at:now,note:'Terbentuk otomatis dari data pekerjaan'}]};vault.lifecycle.push(row);log('REGISTER',kind,x.id);}
      if(yr(row)!==year)continue;
      const title=s(x.title||x.perda||x.id);
      if(title&&title!==row.title){row.title=title;row.updatedAt=now;log('UPDATE_TITLE',kind,x.id);}
      if(row.status==='diterima'&&progressing(kind,x)){
        row.status='dikerjakan';row.updatedAt=now;row.history=(row.history||[]).concat({stage:'dikerjakan',at:now,note:'Otomatis: sumber mulai diproses. Reviu dan pengesahan tetap manual.'});log('START',kind,x.id);
      }
      const newIds=evidenceIds(vault,kind,x).filter(id=>(vault.evidence||[]).some(e=>e.id===id&&yr(e)===year));
      const existing=new Set(row.evidenceIds||[]);
      const added=newIds.filter(id=>!existing.has(id));
      if(added.length){row.evidenceIds=[...existing,...added];row.updatedAt=now;log('LINK_EVIDENCE',kind,x.id);}
    }
    // Derive RHK only when every EXPLICITLY referenced source has the same RHK.
    for(const e of vault.evidence||[]){
      if(!e?.id||!yr(e)||archived(vault,yr(e))||s(e.rhkId))continue;
      const refs=[];
      if(e.taskId)refs.push((vault.tasks||[]).find(x=>x.id===e.taskId&&yr(x)===yr(e)));
      if(e.workflowRefId)for(const key of ['directives','meetings','dims']){const x=(vault[key]||[]).find(x=>x.id===e.workflowRefId&&yr(x)===yr(e));if(x)refs.push(x)}
      const expected=Number(Boolean(e.taskId))+Number(Boolean(e.workflowRefId));
      const unique=[...new Set(refs.filter(Boolean).map(x=>s(x.rhkId)).filter(Boolean))];
      if(refs.length===expected&&unique.length===1&&(vault.rhks||[]).some(r=>r.id===unique[0]&&yr(r)===yr(e))){e.rhkId=unique[0];log('INHERIT_RHK','evidence',e.id);}
    }
    if(events.length){vault.automationEvents.push(...events);if(vault.automationEvents.length>300)vault.automationEvents.splice(0,vault.automationEvents.length-300);}
    return {changed:events.length>0,events};
  }
  function summarize(vault,year,month){
    const mo=Number(month),prefix=year+'-'+String(mo).padStart(2,'0');
    const grouping={},iki={};let total=0,done=0,proven=0;
    for(const {kind,record:x} of records(vault,year)){
      const date=s(x.date||x.receivedAt||x.meetingAt||x.dueAt||x.createdAt).slice(0,7);
      if(date!==prefix)continue;
      total++;const ok=completed(kind,x),support=evidences(vault,kind,x).filter(meaningful);
      if(ok)done++;if(ok&&support.length&&output(kind,x))proven++;
      const codes=[['rhk',s(x.rhkId)],['iki',s(x.ikiId)]];
      for(const [type,key] of codes){if(!key)continue;const target=type==='rhk'?grouping:iki;
        const row=target[key]||(target[key]={key,tasks:0,completed:0,supported:0,evidenceIds:[],sources:[]});
        row.tasks++;if(ok)row.completed++;if(ok&&output(kind,x)&&support.length)row.supported++;
        row.sources.push(kind+':'+x.id);
        for(const evidence of support)if(!row.evidenceIds.includes(evidence.id))row.evidenceIds.push(evidence.id);
      }
    }
    return {year,month:mo,total,done,proven,byRhk:Object.values(grouping),byIki:Object.values(iki),disclaimer:'Hanya draf statistik catatan, bukan realisasi IKI/SKP yang sudah dinilai.'};
  }
  function alerts(vault,year,{now=Date.now(),month=null}={}){
    const list=[];const currentMonth=month||new Date(now).getMonth()+1;
    const add=(type,priority,kind,x,message,go)=>{list.push({id:type+':'+kind+':'+x.id,type,priority,kind,sourceId:x.id,title:s(x.title||x.perda||x.id),message,go,year,updatedAt:x.updatedAt||x.completedAt||x.createdAt||''});};
    for(const {kind,record:x} of records(vault,year)){
      const done=completed(kind,x),support=evidences(vault,kind,x).filter(meaningful);
      const due=s(x.deadlineAt||x.dueAt||(kind==='meeting'?x.minutesDueAt:'')||x.deadline);
      if(!done&&due){let t=Date.parse(due);if(/^\d{4}-\d\d-\d\d$/.test(due))t=Date.parse(due+'T23:59:59');if(Number.isFinite(t)){
        const hours=(t-now)/3600000;
        if(hours<0)add('overdue',3,kind,x,'Tenggat terlewati. Periksa status dan tindak lanjut.',kind==='task'?'tugas':kind==='review'?'telaah':'sla');
        else if(hours<=24)add('soon',2,kind,x,'Tenggat kurang dari 24 jam.', 'sla');
      }}
      if(done&&!support.length)add('missing-evidence',2,kind,x,'Sudah selesai, belum ada bukti dukung lengkap yang terhubung.',kind==='task'?'bukti':'siklus');
      else if(done&&!s(x.rhkId))add('unmapped-rhk',1,kind,x,'Hasil kerja belum dipetakan ke RHK.',kind==='task'?'tugas':'siklus');
      else if(done&&support.length&&!output(kind,x))add('missing-output',2,kind,x,'Bukti ada, uraian hasil pekerjaan belum lengkap.',kind==='task'?'tugas':'siklus');
    }
    for(const e of (vault.evidence||[]).filter(e=>yr(e)===Number(year))){
      if(!e.taskId&&!e.workflowRefId&&!e.rhkId)add('orphan-evidence',1,'evidence',e,'Bukti belum ditautkan ke pekerjaan maupun RHK.','bukti');
      else if(!meaningful(e))add('incomplete-evidence',1,'evidence',e,'Judul, tanggal, atau isi/lokasi bukti belum lengkap.','bukti');
    }
    // Only actions with an explicit in-progress state, never all 120 planned actions.
    for(const a of (vault.skpActions||[]).filter(a=>Number(a.performanceYear)===Number(year)&&Number(a.month)===Number(currentMonth)&&a.status==='Proses')){
      if(new Date(now).getDate()>=25)add('pending-action',1,'skp',a,'Rencana aksi sedang diproses menjelang akhir bulan.','skp');
    }
    return list.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
  }
  function followups(vault,{now=Date.now()}={}){
    const result=[];
    for(const x of vault?.tasks||[]){
      if(x.status!=='Selesai'||!x.completedAt||archived(vault,yr(x)))continue;
      if(evidences(vault,'task',x).some(meaningful))continue;
      const when=Date.parse(x.completedAt)+24*3600000;
      if(!Number.isFinite(when)||when<now-60000||when>now+366*86400000)continue;
      result.push({item_key:'evidence-'+x.id,due_at:new Date(when).toISOString(),offset_minutes:0});
    }
    return result;
  }
  const api={SOURCES,STAGES,records,archived,meaningful,evidenceIds,evidences,completed,reconcile,summarize,alerts,followups};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.SIPETAK_AUTOMATION=api;
})(typeof window==='undefined'?globalThis:window);
