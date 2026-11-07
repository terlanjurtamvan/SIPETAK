import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd();
const js=[];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){if(e.name==='.git'||e.name==='node_modules')continue;const full=path.join(dir,e.name);if(e.isDirectory())await walk(full);else if(e.name.endsWith('.js')||e.name.endsWith('.mjs'))js.push(full);}}
await walk(root);for(const file of js)execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
const html=await readFile('index.html','utf8'),info=JSON.parse(await readFile('BUILD-INFO.json','utf8')),pkg=JSON.parse(await readFile('package.json','utf8')),sw=await readFile('sw.js','utf8');
if(!html.includes('content="'+pkg.version+'"')||info.version!==pkg.version||!html.includes('v'+pkg.version))throw Error('Version numbers must match');
const assets=[...html.matchAll(/(?:src|href)="\.\/(.*?)"/g)].map(m=>m[1]);
for(const name of assets){try{await readFile(path.join(root,name));}catch{throw Error('Missing HTML asset: '+name)}}
for(const name of ['./modules/transcription/transcription.js','./modules/transcription/transcription-utils.js','./modules/transcription/transcription.css','./modules/transcription/combined-engine.js','./modules/transcription/live-engine.js','./modules/transcription/service-status.js'])if(!sw.includes(name))throw Error('Service worker did not register '+name);
if(!html.includes('modules/transcription/transcription.js')||!html.includes('modules/transcription/transcription-utils.js')||!html.includes('modules/transcription/combined-engine.js')||!html.includes('modules/transcription/live-engine.js'))throw Error('Missing module scripts');
const policy=await readFile('_headers','utf8');if(!policy.includes('microphone=(self)'))throw Error('Microphone Permissions-Policy blocked');
if(!policy.includes("media-src 'self' blob:"))throw Error('CSP must allow local blob: audio playback');
if(!(await readFile('functions/api/transcribe-live.js','utf8')).includes('gpt-live-transcribe'))throw Error('Missing realtime transcription Cloudflare Function');
console.log(`PASS: checked ${js.length} JavaScript files, ${assets.length} web assets, versions and permissions.`);
