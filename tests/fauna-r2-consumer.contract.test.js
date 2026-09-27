
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const lower=v=>String(v??'').trim().toLowerCase();
const arr=v=>Array.isArray(v)?v:v==null?[]:[v];
const matches=(metadata,params={})=>{
  const tags=new Set(arr(metadata.tags).map(lower).filter(Boolean));
  const exact={objectId:metadata.objectId,cuoType:metadata.cuoType,kind:metadata.kind,family:metadata.family,subject:metadata.subject,category:metadata.category,persistentMicroSceneId:metadata.persistentMicroSceneId,microSceneId:metadata.microSceneId};
  for(const [key,actual] of Object.entries(exact)){
    if(key==='subject') continue;
    if(params[key]!=null && lower(params[key])!==lower(actual)) return false;
  }
  const tagsAny=arr(params.tagsAny).map(lower).filter(Boolean);
  if(tagsAny.length&&!tagsAny.some(t=>tags.has(t))) return false;
  const tagsAll=arr(params.tagsAll).map(lower).filter(Boolean);
  if(tagsAll.length&&!tagsAll.every(t=>tags.has(t))) return false;
  return true;
};
function catalog(){
  const c={window:null,BlueFox3D:{},console:{info(){},warn(){},error(){}}};c.window=c;vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','data','bible-catalog.js'),'utf8'),c);
  return c.BlueFox3D.BibleCatalog;
}
const byId=(c,id)=>c.find(x=>x.id===id);
const meta=(tags,extra={})=>({subject:'fauna',kind:'fauna_behavior',family:'fauna',category:'fauna',tags,...extra});

test('ObjectM0 matching existant accepte les faits R2 attendus',()=>{
  const c=catalog();
  const cases=[
    ['FAU-01',1,meta(['fauna','fauna_behavior','cautious_approach','no_flee'],{microSceneId:'MSC-CUSTOM-NID-DE-FAUNE5'})],
    ['FAU-03',0,meta(['fauna','fauna_behavior','calm_nearby','period_day'])],
    ['FAU-03',1,meta(['fauna','fauna_behavior','temporal_contrast','period_day','period_night'])],
    ['FAU-04',1,meta(['fauna','fauna_behavior','flee','intrusive_approach'])],
    ['FAU-05',1,meta(['fauna','fauna_behavior','calm_nearby'])],
    ['FAU-07',1,meta(['fauna','fauna_behavior','behavior_observed','behavior_observe'])],
    ['FAU-08',1,meta(['fauna','fauna_behavior','peaceful_group','multi_species','no_flee'],{microSceneId:'MSC-PEACEFUL-FAUNA-001'})],
    ['FAU-11',0,meta(['fauna','fauna_behavior','familiar_encounter'])],
    ['FAU-12',1,meta(['fauna','fauna_behavior','peaceful_group','multi_species','no_flee'],{microSceneId:'MSC-PEACEFUL-FAUNA-001'})]
  ];
  for(const [id,index,eventMeta] of cases){
    const step=byId(c,id).sequence[index];
    assert.equal(matches(eventMeta,step.params),true,`${id}:${step.slot}`);
  }
});

test('ObjectM0 matching rejette les faits incomplets ou mauvaise MSC',()=>{
  const c=catalog();
  assert.equal(matches(meta(['fauna_behavior','calm_nearby']),byId(c,'FAU-04').sequence[1].params),false);
  assert.equal(matches(meta(['fauna_behavior','peaceful_group','multi_species','no_flee'],{microSceneId:'OTHER'}),byId(c,'FAU-08').sequence[1].params),false);
  assert.equal(matches(meta(['fauna_behavior','cautious_approach'],{microSceneId:'MSC-CUSTOM-NID-DE-FAUNE5'}),byId(c,'FAU-01').sequence[1].params),false);
});
