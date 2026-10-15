'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{fileURLToPath}=require('node:url');
const native={readFileSync:fs.readFileSync.bind(fs),writeFileSync:fs.writeFileSync.bind(fs),readFile:fs.readFile.bind(fs)};
const manifest=JSON.parse(native.readFileSync(process.env.BLUEFOX_R2_MANIFEST,'utf8'));
const root=path.resolve(process.env.BLUEFOX_ROOT),candidate=path.resolve(process.env.BLUEFOX_R2_CANDIDATE),base=path.resolve(process.env.BLUEFOX_R2_BASE),reads=new Set(),violations=[],missing=[];
const bank=process.env.BLUEFOX_R2_BANK,expected=bank==='BASE'?manifest.headFiles:{...manifest.headFiles,...manifest.patchFiles};
const verified=new Set();
function verify(input){
 if(typeof input==='number')return;let p=input instanceof URL?fileURLToPath(input):String(input);p=path.resolve(p);
 let rel=path.relative(root,p);if(rel.startsWith('..')||path.isAbsolute(rel)){
  const common=path.relative(candidate,p);
  if(!common.startsWith('..')&&common.startsWith('tests/')&&manifest.patchFiles[common]){rel=common;}
  else {const other=path.relative(root===candidate?base:candidate,p);if(!other.startsWith('..')&&!path.isAbsolute(other)){violations.push({path:p,error:'cross-bank source'});throw Error(`BLUEFOX_CROSS_BANK_READ ${p}`)}return;}
 }
 rel=rel.split(path.sep).join('/');reads.add(rel);if(verified.has(p))return;
 const proof=expected[rel]||manifest.patchFiles[rel];if(!proof){violations.push({path:rel,error:'unlisted read'});throw Error(`BLUEFOX_UNLISTED_DEPENDENCY ${rel}`)}
 let bytes;try{bytes=native.readFileSync(p)}catch(error){missing.push(rel);throw error}
 const sha=proof.algorithm==='git-blob-sha1'?crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'):crypto.createHash('sha256').update(bytes).digest('hex');
 if(sha!==proof.hash){violations.push({path:rel,error:'SHA mismatch'});throw Error(`BLUEFOX_DEPENDENCY_SHA_MISMATCH ${rel}`)}verified.add(p);
}
fs.readFileSync=function(p,...args){verify(p);return native.readFileSync(p,...args)};
fs.readFile=function(p,...args){verify(p);return native.readFile(p,...args)};
const promiseRead=fs.promises.readFile.bind(fs.promises);fs.promises.readFile=async function(p,...args){verify(p);return promiseRead(p,...args)};
process.on('exit',()=>native.writeFileSync(process.env.BLUEFOX_R2_TRACE+'.'+process.pid+'.json',JSON.stringify({reads:[...reads].sort(),violations,missing})));
