import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('modules/transcription/service-status.js','utf8');
function make(fetchFn){const ctx={fetch:fetchFn,AbortSignal};ctx.window=ctx;vm.runInNewContext(source,ctx);return ctx.SIPETAK_TRANSCRIBE_SERVICE;}
test('UI detects truly configured JSON response and errors for static HTML fallback',async()=>{
 const service=make(async()=>new Response(JSON.stringify({live:{ready:false,reason:'not-enabled'},upload:{ready:false,reason:'not-enabled'}}),{status:200,headers:{'content-type':'application/json'}}));
 assert.equal((await service.check()).live.ready,false);
 assert.match(service.statusMessage({ready:false,reason:'not-enabled'}),/TRANSCRIBE_LIVE_ENABLED/);
 const falseSuccess=make(async()=>new Response('<html>hello</html>',{status:200,headers:{'content-type':'text/html'}}));
 await assert.rejects(()=>falseSuccess.check(),/HTML/);
 const missing=make(async()=>new Response('Missing',{status:404}));
 await assert.rejects(()=>missing.check(),/404/);
});
