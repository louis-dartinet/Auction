const fs=require('fs'),vm=require('vm'),assert=require('assert');
let now=100000;const rule=JSON.parse(fs.readFileSync('database.rules.json')).rules.deepwokenV2.session.players.$id['.write'];
class Snap{constructor(value){this.v=value}child(path){let x=this.v;for(const k of String(path).split('/'))x=x?.[k];return new Snap(x)}val(){return this.v!=null&&typeof this.v!=='object'?this.v:null}exists(){return this.v!=null}isNumber(){return typeof this.v==='number'}isString(){return typeof this.v==='string'}}
const checkRule=Function('auth','root','data','newData','now','return '+rule);
let raw,host='HOST',signedUid=host,chain=Promise.resolve();
const directory=()=>({auctionHosts:{[host]:true},deepwokenV2:{session:raw}});
const ref=(path='')=>({
 child:k=>ref(path?path+'/'+k:k),get:async()=>({val:()=>JSON.parse(JSON.stringify(raw))}),
 transaction(fn){const work=chain.then(()=>{
  let old=path?path.split('/').reduce((o,k)=>o?.[k],raw):raw;
  const next=fn(old?JSON.parse(JSON.stringify(old)):old);
  if(next===undefined)return {committed:false,snapshot:{val:()=>raw}};
  if(path&&signedUid!==host&&!checkRule({uid:signedUid},new Snap(directory()),new Snap(old),new Snap(next),now))throw Error('PERMISSION_DENIED');
  if(!path&&signedUid!==host)throw Error('PERMISSION_DENIED');
  if(path){const keys=path.split('/');let parent=raw;for(const k of keys.slice(0,-1))parent=parent[k];parent[keys.at(-1)]=next;}else raw=next;
  return {committed:true,snapshot:{val:()=>JSON.parse(JSON.stringify(raw))}};
 });chain=work.catch(()=>{});return work;}
});
const inputs={};
const ctx={console,Date:class extends Date{static now(){return now}},document:{getElementById:k=>inputs[k]||null,createElement:()=>({set textContent(v){this.innerHTML=v},innerHTML:''}),addEventListener(){}},window:{},setInterval(){},setTimeout(){},clearTimeout(){},localStorage:{getItem:()=>null},confirm:()=>true};
let script=fs.readFileSync('index.html','utf8').split('<script>')[1].split('</script>')[0];
for(const name of ['render','rerenderDynamic','showToast'])script=script.replace('function '+name+'(', 'function '+name+'('); // declarations overridden below inside closure
script=script.replace('init();',`render=()=>{};rerenderDynamic=()=>{};showToast=()=>{};globalThis.test={state,initialiseModel,encode,decode,applyRaw,submitBid,handleAction,hostMutate,settle,parseRobloxId,installRobloxUser,parseImport,changeRoster,undoRosterChange,rosterFingerprint,resetLot,reconcile,decode,setIdentity(uid,hostFlag){currentUser={uid};isHost=hostFlag;connected=true;clockReady=true;sessionRef=__ref;}};`);
ctx.__ref=ref();vm.runInNewContext(script,ctx);const t=ctx.test;
const sync=()=>t.applyRaw(raw),active=()=>Object.values(raw.players).find(p=>p.status==='active');
async function identity(uid){signedUid=uid;t.setIdentity(uid,uid===host);sync();}
(async()=>{
assert.equal(t.parseRobloxId('12345'),12345);assert.equal(t.parseRobloxId('https://www.roblox.com/users/12345/profile'),12345);
for(const bad of ['0','-3','1.5','https://evil.test/12345','abc'])assert.throws(()=>t.parseRobloxId(bad));
const model=t.initialiseModel();t.installRobloxUser(model,{id:777,name:'NewFighter'},'https://tr.rbxcdn.com/avatar.png','');assert.equal(model.players.length,1);assert.equal(model.players.at(-1).robloxId,777);
t.installRobloxUser(model,{id:778,name:'SecondFighter'},null,'');assert.throws(()=>t.installRobloxUser(model,{id:777,name:'NewFighter'},null,'1'),/already/);
model.players[0].audit='bid';assert.throws(()=>t.installRobloxUser(model,{id:888,name:'Other'},null,'0'),/unbid/);
const seed=t.initialiseModel();t.installRobloxUser(seed,{id:1,name:'One'},null,'');t.installRobloxUser(seed,{id:2,name:'Two'},null,'');t.resetLot(seed.players[0],100);raw=t.encode(seed);raw.bidders={A:{name:'Alice',budget:30000},B:{name:'Bob',budget:30000}};await identity(host);
await t.handleAction('round-start',{});assert.equal(active().endsAt,120000);
await identity('A');await t.submitBid(500);assert.equal(active().currentBid,500);
await assert.rejects(t.submitBid(700),/already hold/);await identity('B');
await assert.rejects(t.submitBid(550),/Minimum/);await assert.rejects(t.submitBid(31000),/only have/);
now=118000;await t.submitBid(600);assert.equal(active().endsAt,123000);
let old=JSON.parse(JSON.stringify(active())),good={...old,currentBid:700,highestBidder:'Alice',highestBidderUid:'A',previousBid:600,previousBidder:'Bob',endsAt:123000,audit:old.audit+'700|A|123000\n'};
const permitted=(next,uid='A')=>checkRule({uid},new Snap(directory()),new Snap(old),new Snap(next),now);
assert.equal(permitted(good),true);raw.bidders.A.rosterCount=12;assert.equal(permitted(good),false);raw.bidders.A.rosterCount=11;assert.equal(permitted(good),true);raw.bidders.A.rosterCount=0;
for(const mutation of [{status:'sold'},{username:'tampered'},{audit:'forged'},{soldTo:'Alice'},{endsAt:99999999},{currentBid:31000},{highestBidderUid:'B'},{highestBidder:'Bob'},{roundState:'paused'},{previousBid:1},{openingBid:1}])assert.equal(permitted({...good,...mutation}),false,JSON.stringify(mutation));
assert.equal(permitted(good,'UNAPPROVED'),false);now=123001;assert.equal(permitted(good),false);
await identity(host);await t.hostMutate((m,n)=>t.settle(m,m.players.find(p=>p.status==='active')));
assert.equal(raw.bidders.B.budget,29400);const winner=Object.values(raw.players).find(p=>p.status==='sold');assert.equal(winner.soldTo,'Bob');
await t.hostMutate(m=>t.settle(m,m.players.find(p=>p.status==='sold')));assert.equal(raw.bidders.B.budget,29400);
await t.handleAction('admin-next-lot',{});await t.handleAction('round-start',{});
await identity('A');await t.submitBid(1000);await identity('B');await t.submitBid(1100);
await identity(host);await t.handleAction('round-undo',{});assert.equal(active().currentBid,1000);assert.equal(active().highestBidder,'Alice');
await t.handleAction('round-undo',{});assert.equal(active().currentBid,100);assert.equal(active().highestBidder,null);assert.equal(active().audit,'');
await t.handleAction('round-pause',{});const remaining=active().remainingMs;now+=10000;await identity('A');await assert.rejects(t.submitBid(500),/paused/);
await identity(host);await t.handleAction('round-start',{});assert.equal(active().endsAt,now+remaining);
await assert.rejects(t.handleAction('admin-next-lot',{}),/Finish/);
const parsed=t.parseImport('123, 456\n123\ninvalid');assert.equal(parsed.ids.length,2);assert.equal(parsed.errors.length,2);
assert.equal(t.parseImport('{"players":[{"robloxId":123},{"userId":456}]}').ids.length,2);
assert.throws(()=>t.parseImport('{bad'),/Invalid JSON/);
const managed=t.decode(raw);const soldPick=managed.players.find(p=>p.status==='sold');const previousBudget=managed.bidders.Bob.budget;
t.changeRoster(managed,()=>managed.players=managed.players.filter(p=>p.id!==soldPick.id));assert.equal(managed.bidders.Bob.budget,30000);assert.equal(managed.bidders.Bob.rosterCount,0);
const newId=managed.meta.nextPlayerId;t.undoRosterChange(managed);assert.equal(managed.bidders.Bob.budget,previousBudget);assert.equal(managed.bidders.Bob.rosterCount,1);
t.changeRoster(managed,()=>managed.players=[]);assert.equal(managed.players.length,0);t.installRobloxUser(managed,{id:999,name:'Fresh'},null,'');assert(managed.players[0].id>=newId);assert.throws(()=>t.undoRosterChange(managed),/changed/);
assert.equal(t.decode({players:[null,{id:5,username:'Five',audit:''}],meta:{}}).players.length,1);
const capped=t.initialiseModel();capped.bidders.Alice={uid:'A',name:'Alice',budget:30000};
for(let i=0;i<12;i++){t.installRobloxUser(capped,{id:1000+i,name:'F'+i},null,'');Object.assign(capped.players.at(-1),{status:'sold',soldTo:'Alice',soldPrice:100});}
t.installRobloxUser(capped,{id:2000,name:'Thirteenth'},null,'');const thirteenth=capped.players.at(-1);t.resetLot(thirteenth,100);thirteenth.highestBidder='Alice';thirteenth.currentBid=100;t.reconcile(capped);t.settle(capped,thirteenth);assert.equal(thirteenth.status,'active');assert.equal(thirteenth.roundState,'paused');assert.equal(capped.bidders.Alice.rosterCount,12);
capped.players.splice(0,1);t.reconcile(capped);t.settle(capped,thirteenth);assert.equal(thirteenth.status,'sold');assert.equal(capped.bidders.Alice.rosterCount,12);
console.log('PASS: bulk parsing, roster refunds/undo, stable IDs, sparse data and 12-player cap;  live transaction simulation, late extension, pause/resume, repeat undo, settlement without double debit, budget/identity/deadline checks, and 11 tampered-rule payloads rejected.');
})().catch(e=>{console.error(e);process.exitCode=1});
