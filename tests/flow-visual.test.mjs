import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script=fs.readFileSync('flow-visual.js','utf8');
const solo=fs.readFileSync('solo-workspace.js','utf8');
const sekwan=fs.readFileSync('sekwan-desk.js','utf8');
function flow(){const h={window:null};h.window=h;vm.createContext(h);vm.runInContext(script,h);return h;}
function soloHarness(){const h={window:null,render(){}};h.window=h;vm.createContext(h);vm.runInContext(script,h);vm.runInContext(solo,h);return h;}
function sekwanHarness(){const h={window:null,data:{sekwanBills:[],sekwanVisitors:[],sekwanContacts:[],directives:[]},myItems:()=>[],myActiveYear:()=>2026,render(){}};h.window=h;vm.createContext(h);vm.runInContext(script,h);vm.runInContext(sekwan,h);return h;}
test('Flowchart outputs directional SVG paths, clickable HTML nodes and mobile timeline',()=>{
 const h=flow();const html=h.SIPETAK_FLOW.render({id:'mock',nodes:[{id:'a',x:100,y:100,view:'catatan',title:'Masukan'},{id:'b',x:400,y:100,view:'laporan',title:'Hasil'}],edges:[{from:'a',to:'b'}]});
 assert.match(html,/viewBox="0 0 1000 560"/);assert.match(html,/class="fw-edge/);assert.match(html,/marker-end="url\(#mock-arr\)"/);
 assert.match(html,/data-action="navigate" data-view="catatan"/);assert.match(html,/data-action="navigate" data-view="laporan"/);assert.match(html,/class="fw-timeline"/);
});
test('Unsafe text cannot inject handlers or tag markup into the visual map',()=>{
 const h=flow();const html=h.SIPETAK_FLOW.render({id:'x',title:'<script>alert(1)</script>',nodes:[{id:'a',x:100,y:100,view:'catatan',title:'<img onerror=alert(1)>',note:'A & B'}],edges:[]});
 assert.ok(!html.includes('<img onerror='));assert.ok(!html.includes('<script>alert(1)'));
 assert.match(html,/&lt;img/);assert.match(html,/A &amp; B/);
});
test('AS-IS chart has actual SVG branch and decision; every desktop and mobile destination resolves',()=>{
 const h=soloHarness();const html=h.SIPETAK_SOLO.mapPage();const ids=[...fs.readFileSync('app.js','utf8').matchAll(/\['([a-z]+)','[^']+','([^']+)'/g)].map(m=>m[1]);
 assert.match(html,/data-flow="solo-current"/);assert.match(html,/fw-decision/);assert.match(html,/fw-edges/);
 for(const m of html.matchAll(/data-action="navigate" data-view="([a-z]+)"/g))assert.ok(ids.includes(m[1]),'Unknown view: '+m[1]);
 const svg=(html.match(/class="fw-edge/g)||[]).length;assert.ok(svg>=7);
 h.SIPETAK_SOLO.action({dataset:{action:'solo-map-tab',tab:'to-be'}});
 const future=h.SIPETAK_SOLO.mapPage();assert.match(future,/data-flow="solo-target"/);assert.match(future,/TARGET · BELUM OTOMATIS/);assert.match(future,/fw-future-edge/);
 assert.notEqual(html,future);
});
test('Sekwan chart links to real Raperda, guest book and quick call tabs',()=>{
 const h=sekwanHarness();const html=h.SIPETAK_SEKWAN.page();assert.match(html,/data-flow="sekwan-flow"/);
 for(const tab of ['raperda','tamu','kontak','disposisi'])assert.match(html,new RegExp('data-action="sw-tab" data-tab="'+tab+'"'));
 const n=(html.match(/class="fw-node /g)||[]).length;assert.ok(n>=8);
 for(const tab of ['raperda','tamu','kontak']){h.SIPETAK_SEKWAN.action({dataset:{action:'sw-tab',tab}});assert.match(h.SIPETAK_SEKWAN.page(),new RegExp('sw-form-'+tab));}
});
test('Browser references load before graph pages, appear in offline shell, and audio engine is untouched',()=>{
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 assert.ok(html.indexOf('flow-visual.js')<html.indexOf('solo-workspace.js'));
 for(const f of ['flow-visual.css','flow-visual.js']){assert.ok(sw.includes(f),f);assert.ok(html.includes(f),f);}
 assert.ok(!fs.readFileSync('flow-visual.js','utf8').includes('getUserMedia'));
 assert.ok(!fs.readFileSync('flow-visual.js','utf8').includes('localStorage'));
});
