'use strict';
/* SIPETAK: pembaca teks PDF lokal tanpa koneksi jaringan.
 * Mendukung sebagian PDF berbasis teks (Tj/TJ, Flate, ToUnicode sederhana).
 * BUKAN OCR dan BUKAN pengganti pemeriksaan kutipan terhadap PDF asli.
 * Berhenti bila tidak bisa mengurai teks secara andal. */
(function(root){
 const MAX_BYTES=10*1024*1024, MAX_PAGES=250, MAX_DECODED=16*1024*1024;
 function binary(bytes){let out='';for(let i=0;i<bytes.length;i+=32768)out+=String.fromCharCode(...bytes.subarray(i,i+32768));return out;}
 function fromBinary(str){const a=new Uint8Array(str.length);for(let i=0;i<str.length;i++)a[i]=str.charCodeAt(i)&255;return a;}
 function utf16(hex){let s='';for(let i=0;i+3<hex.length;i+=4)s+=String.fromCharCode(parseInt(hex.slice(i,i+4),16));return s;}
 function cmapFrom(text){const map=new Map();let m;const chars=/beginbfchar([\s\S]*?)endbfchar/g;
   while((m=chars.exec(text))){const pair=/<([A-Fa-f0-9]+)>\s*<([A-Fa-f0-9]+)>/g;let p;while((p=pair.exec(m[1])))map.set(p[1].toUpperCase(),utf16(p[2]));}
   const ranges=/beginbfrange([\s\S]*?)endbfrange/g;
   while((m=ranges.exec(text))){const line=/<([A-Fa-f0-9]+)>\s*<([A-Fa-f0-9]+)>\s*(<([A-Fa-f0-9]+)>|\[([^\]]+)\])/g;let r;while((r=line.exec(m[1]))){const a=parseInt(r[1],16),b=parseInt(r[2],16),digits=r[1].length;if(b-a>512)continue;
     const list=r[5]?[...r[5].matchAll(/<([A-Fa-f0-9]+)>/g)].map(x=>utf16(x[1])):null;
     for(let c=a;c<=b;c++){const u=list?list[c-a]:utf16((parseInt(r[4],16)+(c-a)).toString(16).padStart(r[4].length,'0'));if(u)map.set(c.toString(16).toUpperCase().padStart(digits,'0'),u);}
   }}return map;
 }
 function decodeToken(token,map){let bytes=[];
   if(token[0]==='<'){
     const hex=token.slice(1,-1).replace(/\s/g,'');for(let i=0;i<hex.length;i+=2)bytes.push(parseInt((hex.slice(i,i+2)+'0').slice(0,2),16));
   }else{const s=token.slice(1,-1);for(let i=0;i<s.length;i++){const c=s[i];if(c==='\\'&&i+1<s.length){const t=s[++i];if(/[0-7]/.test(t)){let oct=t;for(let j=0;j<2&&i+1<s.length&&/[0-7]/.test(s[i+1]);j++)oct+=s[++i];bytes.push(parseInt(oct,8)&255);}else if(t==='n')bytes.push(10);else if(t==='r')bytes.push(13);else if(t==='t')bytes.push(9);else if(t==='b')bytes.push(8);else if(t==='f')bytes.push(12);else if(t==='\n'){}else if(t==='\r'){if(s[i+1]==='\n')i++;}else bytes.push(t.charCodeAt(0)&255);}else bytes.push(c.charCodeAt(0)&255);}}
   if(!map||!map.size)return new TextDecoder('windows-1252').decode(new Uint8Array(bytes));
   const width=Math.max(...map.keys().map(k=>k.length))/2;let result='';for(let i=0;i<bytes.length;i+=width){const hex=bytes.slice(i,i+width).map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();result+=map.get(hex)||'�';}return result;
 }
 async function inflate(bytes){if(typeof DecompressionStream==='undefined')throw Error('Browser tidak mendukung dekompresi PDF lokal. Gunakan Chrome, Safari, atau Edge terbaru.');
   try{const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));const reader=stream.getReader();const chunks=[];let size=0;try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_DECODED){await reader.cancel();throw Error('Teks PDF hasil dekompresi terlalu besar untuk dibaca dengan aman.');}chunks.push(value);}}finally{reader.releaseLock();}const arr=new Uint8Array(size);let pos=0;for(const c of chunks){arr.set(c,pos);pos+=c.byteLength;}return binary(arr);}catch(e){if(/terlalu besar/.test(e.message))throw e;throw Error('Gagal membuka teks terkompresi dalam PDF. Format PDF tidak didukung.');}
 }
 function ascii85(bytes){const input=binary(bytes).replace(/^<~/,'').replace(/~>[\s\S]*$/,'');const out=[];let value=[];
   function emit(group,n=4){let acc=0;for(const d of group)acc=acc*85+d;if(acc>0xFFFFFFFF)throw Error('Encoding PDF tidak valid.');for(let shift=24;shift>=8*(4-n);shift-=8)out.push((acc>>>shift)&255);}
   for(const c of input){if(/\s/.test(c))continue;if(c==='z'){if(value.length)throw Error('Encoding PDF tidak valid.');out.push(0,0,0,0);continue;}const d=c.charCodeAt(0)-33;if(d<0||d>84)throw Error('Encoding PDF ASCII85 tidak valid.');value.push(d);if(value.length===5){emit(value);value=[];}}
   if(value.length){if(value.length===1)throw Error('Encoding PDF tidak valid.');const count=value.length-1;while(value.length<5)value.push(84);emit(value,count);}return new Uint8Array(out);
 }
 async function getStream(body){const match=/stream\r?\n/.exec(body);if(!match)return null;const start=match.index+match[0].length;const end=body.indexOf('endstream',start);if(end<0)throw Error('Struktur stream PDF rusak.');let bytes=fromBinary(body.slice(start,end).replace(/\r?\n$/,''));
   const header=body.slice(0,start);const filterMatch=/\/Filter\s*(\[[^\]]+\]|\/[A-Za-z0-9]+)/.exec(header);
   const filters=filterMatch?[...filterMatch[1].matchAll(/\/([A-Za-z0-9]+)/g)].map(m=>m[1]):[];
   for(const name of filters){if(name==='ASCII85Decode'||name==='A85')bytes=ascii85(bytes);
     else if(name==='FlateDecode'||name==='Fl'){bytes=fromBinary(await inflate(bytes));}
     else throw Error('Jenis kompresi PDF '+name+' belum didukung. Pilih file PDF lain atau impor TXT.');
   }if(bytes.length>MAX_DECODED)throw Error('Teks PDF terlalu besar untuk dianalisis.');return binary(bytes);
 }

 function textTokens(stream,fontMaps){const segments=stream.match(/BT[\s\S]*?ET/g)||[];const parts=[];
   const rx=/\/([A-Za-z0-9_]+)\s+[\d.]+\s+Tf|(\((?:\\[\s\S]|[^\\)])*\)|<[0-9A-Fa-f\s]+>)\s*Tj|(\[(?:\((?:\\[\s\S]|[^\\)])*\)|<[0-9A-Fa-f\s]+>|[^\]])*\])\s*TJ|\bT\*\b|[-\d.]+\s+[-\d.]+\s+Td\b/g;
   for(const seg of segments){let font='',m;while((m=rx.exec(seg))){if(m[1]){font=m[1];continue;}if(m[2]){parts.push(decodeToken(m[2],fontMaps.get(font)));continue;}if(m[3]){const values=[...m[3].matchAll(/\((?:\\[\s\S]|[^\\)])*\)|<[0-9A-Fa-f\s]+>|-?\d+(?:\.\d+)?/g)].map(x=>x[0]);let line='';for(const v of values){if(v[0]==='('||v[0]==='<')line+=decodeToken(v,fontMaps.get(font));else if(Number(v)<-300)line+=' ';}parts.push(line);continue;}if(/Td\b|T\*/.test(m[0]))parts.push('\n');}}
   return parts.join(' ').replace(/[ \t]+\n[ \t]*/g,'\n').replace(/[ \t]{2,}/g,' ').trim();
 }
 async function extract(file){if(!file||!/\.pdf$/i.test(file.name)||!/^application\/pdf$|^$/.test(file.type))throw Error('Pilih berkas PDF (.pdf).');if(file.size>MAX_BYTES)throw Error('PDF maksimal 10 MB.');if(file.size<20)throw Error('Berkas PDF kosong/rusak.');
   const bytes=new Uint8Array(await file.arrayBuffer());const raw=binary(bytes);if(!raw.startsWith('%PDF-'))throw Error('File bukan PDF yang valid.');if(/\/Encrypt\b/.test(raw))throw Error('PDF terenkripsi/password tidak dapat diimpor.');
   const objects=new Map();for(const match of raw.matchAll(/(?:^|\n|\r)(\d+)\s+\d+\s+obj\b([\s\S]*?)\bendobj\b/g))objects.set(Number(match[1]),match[2]);
   if(!objects.size)throw Error('Struktur PDF tidak bisa dibaca.');const decoded=new Map();
   async function resolve(id){if(decoded.has(id))return decoded.get(id);const body=objects.get(id);if(!body)return '';const str=await getStream(body);decoded.set(id,str||'');return str||'';}
   const cmapByObject=new Map();for(const [id,body] of objects){const u=/\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(body);if(u){const cm=cmapFrom(await resolve(Number(u[1])));cmapByObject.set(id,cm);}}
   const fontMaps=new Map();for(const [id,body] of objects){const fm=/\/Font\s*<<([\s\S]*?)>>/.exec(body);if(fm){for(const x of fm[1].matchAll(/\/([A-Za-z0-9_]+)\s+(\d+)\s+\d+\s+R/g)){fontMaps.set(x[1],cmapByObject.get(Number(x[2])));}}}
   // Fallback for inherited font resources with PDF text containing /F1 etc.
   if(!fontMaps.size){for(const [id,body] of objects){if(/\/Type\s*\/Font\b/.test(body))fontMaps.set('F'+id,cmapByObject.get(id));}}
   const pageObjects=[...objects].filter(([,body])=>/\/Type\s*\/Page\b/.test(body));if(pageObjects.length>MAX_PAGES)throw Error('PDF lebih dari 250 halaman. Pilih kutipan secara manual.');
   let strings=[];for(const [,page] of pageObjects){const ref=/\/Contents\s+(\d+)\s+\d+\s+R/.exec(page),list=/\/Contents\s*\[([^\]]+)\]/.exec(page);let ids=[];
     if(list)ids=[...list[1].matchAll(/(\d+)\s+\d+\s+R/g)].map(x=>Number(x[1]));else if(ref)ids=[Number(ref[1])];
     for(const id of ids){let t=textTokens(await resolve(id),fontMaps);if(t)strings.push(t);}
   }
   if(!pageObjects.length){for(const [id,body] of objects){if(/\/Length\b/.test(body)&&/BT/.test(await resolve(id))){const s=textTokens(await resolve(id),fontMaps);if(s)strings.push(s);}}}
   let text=strings.join('\n\n').replace(/\u0000/g,'').replace(/\s{4,}/g,' ').trim();
   if(text.length<45||text.replace(/[\s\d\W]/g,'').length<25)throw Error('Teks tidak dapat diekstrak secara andal. PDF mungkin hasil scan, memakai font khusus, atau tidak didukung. Gunakan OCR yang disetujui instansi lalu impor TXT.');
   const bad=(text.match(/�/g)||[]).length;if(bad>Math.max(3,text.length*.015))throw Error('Teks PDF tidak terbaca secara andal (font/encoding khusus). Gunakan PDF berbasis teks lain atau OCR yang disetujui instansi.');
   return {text,pages:pageObjects.length||null,chars:text.length,limited:text.length>16000,excerpt:text.slice(0,16000)};
 }
 function selectExcerpt(text,keyword='',max=16000){const source=String(text||'');const q=String(keyword||'').trim().slice(0,80);if(!q)return {excerpt:source.slice(0,max),found:null};const at=source.toLocaleLowerCase('id').indexOf(q.toLocaleLowerCase('id'));
   if(at<0)return {excerpt:source.slice(0,max),found:false};const start=Math.max(0,at-800);return {excerpt:source.slice(start,start+max),found:true};}
 const api={extract,selectExcerpt,cmapFrom,decodeToken};root.SIPETAK_PDF_TEXT=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
