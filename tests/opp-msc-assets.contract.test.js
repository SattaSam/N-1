const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=process.env.BLUEFOX_ROOT||path.resolve(__dirname,'..');const w={BlueFoxCustomMicroScenes:[]};w.window=w;vm.runInNewContext(fs.readFileSync(path.join(root,'data','custom-micro-scenes-opp.js'),'utf8'),{window:w,console});
const scenes=w.BlueFoxCustomMicroScenes;assert.equal(scenes.length,9);const by=new Map(scenes.map(s=>[s.id,s]));assert.equal(by.size,9);
const expected={
'MSC-CUSTOM-BIOME-FRONTIERE':'b495adcfdc5a28caf170a9815ca62b8c0ccec28d','MSC-CUSTOM-BREATHING-GROVE':'9a62440674b8ce9677bd76696f58b770b903787d','MSC-CUSTOM-DISTANT-STORM':'a5cda6f0e732bd82444a5fa37acbfeba853a75d5','MSC-CUSTOM-FOG-SEA-SUSPENDU':'b4718a8f000f52da061f8cd6f0dde2e3d10af6a7','MSC-CUSTOM-INVERTED-RAIN':'acc6765284eeb34541922b2d57e7159e42c5de37','MSC-CUSTOM-SHADOW-NOCTURAL':'588492db6169ad77fe246f597931de0860d46b25','MSC-CUSTOM-SHADOW-ROCKY-001':'cd4160c5579fe65b7358f3ea7a786b109437466c','MSC-CUSTOM-SHADOW-TRANSLUCENT':'43c77001afb5137a9a9e2299cb6ca24bc43ef76a','MSC-CUSTOM-SINGING-STONES':'2811d0a6fcc9de87f9502d4f43aa465e76583306'};
const gitBlob=text=>crypto.createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
for(const [id,sha] of Object.entries(expected)){const scene=by.get(id);assert(scene,`${id} absent`);const text=JSON.stringify(scene,null,2)+'\n';assert.equal(gitBlob(text),sha,`${id}: composition differs from HEAD asset`);}
const rocky=by.get('MSC-CUSTOM-SHADOW-ROCKY-001');assert(rocky.objects.some(o=>o.type==='npc_rocky'));assert(rocky.objects.some(o=>o.type==='base_fire'));
const translucent=by.get('MSC-CUSTOM-SHADOW-TRANSLUCENT');assert(translucent.objects.some(o=>o.type==='npc_translucent'));
const before=scenes.length;vm.runInNewContext(fs.readFileSync(path.join(root,'data','custom-micro-scenes-opp.js'),'utf8'),{window:w,console});assert.equal(w.BlueFoxCustomMicroScenes.length,before,'extension must be idempotent by scene id');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');const opp=index.indexOf('./data/custom-micro-scenes-opp.js'),micro=index.indexOf('./engine/micro-scenes.js');assert(opp>0&&micro>opp,'OPP registry must load before MicroScenes consumes it');
console.log('PASS OPP MSC: 9 exact HEAD assets + Rocky fire/PNJ + idempotent registry + correct load order');
