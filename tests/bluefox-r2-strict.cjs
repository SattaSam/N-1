'use strict';
// node tests/bluefox-r2-strict.cjs --base /exact/BASE --candidate /patched/CANDIDAT --out /results
// Exit 0: all suites green; 1: scope/closure/regression failure; 2: scoped PASS,
// with historical shared failures still preventing a global certification.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1]};
const base=path.resolve(arg('--base')||''),candidate=path.resolve(arg('--candidate')||''),out=path.resolve(arg('--out')||'bluefox-r2-results');
if(!arg('--base')||!arg('--candidate')||base===candidate)throw Error('Provide distinct --base and --candidate roots.');
const manifestPath=path.join(__dirname,'bluefox-r2-closure.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const hash=(bytes,algorithm)=>algorithm==='git-blob-sha1'?crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'):crypto.createHash('sha256').update(bytes).digest('hex');
function verifyClosure(){for(const[bank,root]of [['BASE',base],['CANDIDAT',candidate]]){const files=bank==='BASE'?manifest.headFiles:{...manifest.headFiles,...manifest.patchFiles};for(const[p,proof]of Object.entries(files)){const b=fs.readFileSync(path.join(root,p));if(hash(b,proof.algorithm)!==proof.hash)throw Error(`SHA mismatch ${bank}/${p}`)}}}
verifyClosure();fs.mkdirSync(out,{recursive:true});
const specialArgs={'npc-r1-regression-common.test.js':'engine/npc-runtime.js','r-mission-generated-continuity.runtime.test.js':'engine/mission-manager.js'};
const historical=Object.keys(manifest.headFiles).filter(p=>/^tests\/.*\.test\.js$/.test(p)).sort();
const additions=Object.keys(manifest.patchFiles).filter(p=>/^tests\/.*\.test\.js$/.test(p)&&!manifest.headFiles[p]).sort();
const jobs=['BASE','CANDIDAT'].flatMap(bank=>[...historical,...additions].map(file=>({bank,file,root:bank==='BASE'?base:candidate,added:additions.includes(file)})));
let next=0;const results=[];
function canonical(s){return s.split(base).join('<ROOT>').split(candidate).join('<ROOT>')}
async function worker(){while(next<jobs.length){const j=jobs[next++];await new Promise(resolve=>{
 const script=path.join(j.added?candidate:j.root,j.file),name=path.basename(j.file),extra=specialArgs[name];
 const trace=path.join(out,`${j.bank}-${name}.reads.json`),log=path.join(out,`${j.bank}-${name}.tap`);
 const args=['--require',path.join(candidate,'tests/bluefox-r2-closure-hook.cjs'),...(!extra?['--test','--test-reporter=tap']:[]),script,...(extra?[path.join(j.root,extra)]:[])];
 const child=cp.spawn(process.execPath,args,{cwd:j.root,env:{...process.env,NODE_OPTIONS:'',BLUEFOX_ROOT:j.root,TARGET_ROOT:j.root,BIBLE_RUNTIME_FILE:path.join(j.root,'engine/bible-runtime-v0-1-unified.js'),SAVE_FILE:path.join(j.root,'engine/save-ui-bridge.js'),BLUEFOX_R2_MANIFEST:manifestPath,BLUEFOX_R2_TRACE:trace,BLUEFOX_R2_BANK:j.bank,BLUEFOX_R2_CANDIDATE:candidate,BLUEFOX_R2_BASE:base}});
 let text='';const timer=setTimeout(()=>child.kill('SIGKILL'),90000);child.stdout.on('data',s=>text+=s);child.stderr.on('data',s=>text+=s);child.on('close',(code,signal)=>{clearTimeout(timer);fs.writeFileSync(log,text);let audit={reads:[],violations:[],missing:[]};const parts=fs.readdirSync(out).filter(f=>f.startsWith(path.basename(trace)+'.'));if(!parts.length)audit.violations.push({error:'no dependency trace'});for(const f of parts){const a=JSON.parse(fs.readFileSync(path.join(out,f),'utf8'));for(const k of ['reads','violations','missing'])audit[k].push(...a[k])}audit.reads=[...new Set(audit.reads)].sort();
 const counts={};for(const k of ['tests','pass','fail','skipped'])counts[k]=Number(text.match(new RegExp('^# '+k+' (\\d+)$','m'))?.[1]||0);
 const successful=[...text.matchAll(/^\s*ok \d+ - (.+)$/gm)].map(m=>canonical(m[1])).filter(x=>!/#\s*SKIP/i.test(x));
 results.push({...j,code,signal,counts,successful,audit});process.stdout.write(`${results.length}/${jobs.length} ${j.bank} ${name}: ${code}\n`);resolve()})
 })}}
(async()=>{await Promise.all([worker(),worker(),worker(),worker()]);verifyClosure();const regressions=[];
 for(const file of historical){const a=results.find(r=>r.file===file&&r.bank==='BASE'),b=results.find(r=>r.file===file&&r.bank==='CANDIDAT');const available=[...b.successful];const lost=[];for(const s of a.successful){const i=available.indexOf(s);if(i<0)lost.push(s);else available.splice(i,1)}if(lost.length||b.counts.tests<a.counts.tests||b.counts.skipped>a.counts.skipped||(a.code===0&&b.code!==0))regressions.push({file,lost,base:a.counts,candidate:b.counts})}
 const scope=manifest.scopeSuites.map(file=>results.find(r=>r.bank==='CANDIDAT'&&r.file===file));
 const integrity=results.flatMap(r=>r.audit.violations.map(v=>({bank:r.bank,file:r.file,...v})));
 const scopedPass=scope.every(r=>r&&r.code===0&&r.counts.skipped===0&&r.audit.missing.length===0)&&!regressions.length&&!integrity.length;
 const oldFailures=results.filter(r=>!r.added&&r.bank==='CANDIDAT'&&r.code!==0).map(r=>r.file);
 const summary={head:manifest.head,headFiles:Object.keys(manifest.headFiles).length,patchFiles:Object.keys(manifest.patchFiles).length,scope:scope.map(r=>({file:r.file,code:r.code,counts:r.counts,readFiles:r.audit.reads.length})),regressions,integrity,unresolvedHistoricalSuites:oldFailures,scopedStatus:scopedPass?'PASS':'FAIL',globalCertification:scopedPass&&!oldFailures.length?'PASS':'UNPROVEN'};
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({summary,results},null,2));console.log(JSON.stringify(summary,null,2));process.exitCode=!scopedPass?1:oldFailures.length?2:0;
})().catch(e=>{console.error(e.stack);process.exitCode=1});
