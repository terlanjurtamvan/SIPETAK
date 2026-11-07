'use strict';
/* SIPETAK v3.15 · interactive visual workflow, no network and no persistence.
 * All destinations are existing app views or existing Asisten Sekwan tabs.
 * The diagram remains readable as a vertical timeline on narrow screens. */
(function(root){
 const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 const validKey=x=>/^[a-z][a-z0-9-]*$/.test(String(x||''));
 function port(n,side){const rad=n.shape==='decision'?69:91;const h=n.shape==='decision'?66:52;switch(side){case 'left':return[n.x-rad,n.y];case 'top':return[n.x,n.y-h];case 'bottom':return[n.x,n.y+h];default:return[n.x+rad,n.y];}}
 function curve(a,b,fromSide,toSide){const [x1,y1]=port(a,fromSide),[x2,y2]=port(b,toSide);const horizontal=(fromSide==='right'||fromSide==='left')&&(toSide==='left'||toSide==='right');if(horizontal){const dx=x2-x1;const sweep=clamp(Math.abs(dx)*0.52,35,110);const step=Math.sign(dx)||1;return `M ${x1} ${y1} C ${x1+sweep*step} ${y1}, ${x2-sweep*step} ${y2}, ${x2} ${y2}`;}const dy=y2-y1,sweep=clamp(Math.abs(dy)*.47,28,80),step=Math.sign(dy)||1;return `M ${x1} ${y1} C ${x1} ${y1+sweep*step}, ${x2} ${y2-sweep*step}, ${x2} ${y2}`;}
 function render(cfg){
  const id=String(cfg.id||'flow').replace(/[^a-z0-9-]/g,'');
  const nodes=(cfg.nodes||[]).filter(n=>validKey(n.id)&&validKey(n.view||n.tab));
  const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));
  const edges=(cfg.edges||[]).filter(e=>byId[e.from]&&byId[e.to]);
  const heading=`<div class="fw-heading"><div><span class="fw-eyebrow">${safe(cfg.kicker||'WORKFLOW / CLICKABLE MAP')}</span><h3>${safe(cfg.title||'Peta Alur')}</h3><p>${safe(cfg.subtitle||'Klik simpul untuk membuka modul yang terhubung.')}</p></div><span class="fw-live"><span class="fw-live-dot"></span>${safe(cfg.chip||'NAVIGASI INTERAKTIF')}</span></div>`;
  const markers=`<defs><marker id="${id}-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#7ef1d2"/></marker><marker id="${id}-future" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f5aee9"/></marker></defs>`;
  const paths=edges.map((e,i)=>`<path class="fw-edge ${e.planned?'fw-future-edge':''}" data-from="${safe(e.from)}" data-to="${safe(e.to)}" d="${curve(byId[e.from],byId[e.to],e.fromSide||'right',e.toSide||'left')}" marker-end="url(#${id}-${e.planned?'future':'arr'})"/>`).join('');
  const buttons=nodes.map(n=>{
   const action=n.tab?'sw-tab':'navigate',attr=n.tab?`data-tab="${safe(n.tab)}"`:`data-view="${safe(n.view)}"`;
   const style=`--fw-x:${n.x/10}%;--fw-y:${n.y/5.6}%;`;
   return `<button type="button" class="fw-node fw-${safe(n.tone||'violet')} ${n.shape==='decision'?'fw-decision':''} ${n.planned?'fw-planned':''}" style="${style}" data-node="${safe(n.id)}" data-action="${action}" ${attr} aria-label="${safe(n.title)} — ${safe(n.note||'buka halaman')}" title="${safe(n.title)}: ${safe(n.note||'Buka modul')}"><span class="fw-node-icon" aria-hidden="true">${safe(n.icon||'↗')}</span><strong>${safe(n.title)}</strong><small>${safe(n.note||'Buka modul')}</small>${n.planned?'<span class="fw-node-tag">TARGET · BELUM OTOMATIS</span>':''}</button>`;
  }).join('');
  const mobile=(cfg.mobileOrder||nodes.map(n=>n.id)).map((key,i)=>{const n=byId[key];if(!n)return '';const action=n.tab?'sw-tab':'navigate';return `<li class="fw-timeline-row"><span class="fw-rail"><span>${String(i+1).padStart(2,'0')}</span></span><button type="button" data-action="${action}" ${n.tab?`data-tab="${safe(n.tab)}"`:`data-view="${safe(n.view)}"`} class="fw-mobile-node fw-${safe(n.tone||'violet')}"><span class="fw-mobile-symbol" aria-hidden="true">${safe(n.icon||'↗')}</span><span><strong>${safe(n.title)}</strong><small>${safe(n.note||'Buka modul')}</small>${n.planned?'<em>Target pengembangan</em>':''}</span><span aria-hidden="true">↗</span></button></li>`;}).join('');
  const label=(cfg.legend||['● Modul tersedia','◇ Keputusan / periksa','⇢ Klik untuk membuka']).map(x=>`<span>${safe(x)}</span>`).join('');
  return `<section class="fw-shell" data-flow="${id}">${heading}<div class="fw-legend">${label}</div><div class="fw-scroller"><div class="fw-board" role="group" aria-label="${safe(cfg.title||'Diagram alur kerja')}"><div class="fw-grid" aria-hidden="true"></div><svg class="fw-edges" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">${markers}${paths}</svg>${buttons}</div></div><ol class="fw-timeline" aria-label="Urutan alur kerja untuk layar kecil">${mobile}</ol><div class="fw-foot"><span aria-hidden="true">✦</span> ${safe(cfg.footer||'Pilih simpul untuk membuka pekerjaan. Hasil otomatis tetap perlu diperiksa.')}</div></section>`;
 }
 if(typeof document!=='undefined'){
  const highlight=(el,on)=>{const n=el?.closest?.('.fw-node');if(!n)return;const container=n.closest('.fw-board');if(!container)return;const key=n.dataset.node;container.querySelectorAll('.fw-edge').forEach(path=>{if(path.dataset.from===key||path.dataset.to===key)path.classList.toggle('fw-edge-lit',on)});};
  document.addEventListener('pointerover',e=>highlight(e.target,true));
  document.addEventListener('pointerout',e=>highlight(e.target,false));
  document.addEventListener('focusin',e=>highlight(e.target,true));
  document.addEventListener('focusout',e=>highlight(e.target,false));
 }
 root.SIPETAK_FLOW={render,curve};
})(window);
