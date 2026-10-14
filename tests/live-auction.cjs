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
script=script.replace('init();',`render=()=>{};rerenderDynamic=()=>{};showToast=()=>{};globalThis.test={state,initialiseModel,encode,decode,applyRaw,submitBid,handleAction,hostMutate,settle,parseRobloxId,installRobloxUser,setIdentity(uid,hostFlag){currentUser={uid};isHost=hostFlag;connected=true;clockReady=true;sessionRef=__ref;}};`);
ctx.__ref=ref();vm.runInNewContext(script,ctx);const t=ctx.test;
const sync=()=>t.applyRaw(raw),active=()=>Object.values(raw.players).find(p=>p.status==='active');
async function identity(uid){signedUid=uid;t.setIdentity(uid,uid===host);sync();}
(async()=>{
assert.equal(t.parseRobloxId('12345'),12345);assert.equal(t.parseRobloxId('https://www.roblox.com/users/12345/profile'),12345);
for(const bad of ['0','-3','1.5','https://evil.test/12345','abc'])assert.throws(()=>t.parseRobloxId(bad));
const model=t.initialiseModel();t.installRobloxUser(model,{id:777,name:'NewFighter'},'https://tr.rbxcdn.com/avatar.png','');assert.equal(model.players.length,43);assert.equal(model.players.at(-1).robloxId,777);
assert.throws(()=>t.installRobloxUser(model,{id:777,name:'NewFighter'},null,'0'),/already/);
model.players[0].audit='bid';assert.throws(()=>t.installRobloxUser(model,{id:888,name:'Other'},null,'0'),/unbid/);
raw=t.encode(t.initialiseModel());raw.bidders={A:{name:'Alice',budget:30000},B:{name:'Bob',budget:30000}};await identity(host);
await t.handleAction('round-start',{});assert.equal(active().endsAt,120000);
await identity('A');await t.submitBid(500);assert.equal(active().currentBid,500);
await assert.rejects(t.submitBid(700),/already hold/);await identity('B');
await assert.rejects(t.submitBid(550),/Minimum/);await assert.rejects(t.submitBid(31000),/only have/);
now=118000;await t.submitBid(600);assert.equal(active().endsAt,123000);
let old=JSON.parse(JSON.stringify(active())),good={...old,currentBid:700,highestBidder:'Alice',highestBidderUid:'A',previousBid:600,previousBidder:'Bob',endsAt:123000,audit:old.audit+'700|A|123000\n'};
const permitted=(next,uid='A')=>checkRule({uid},new Snap(directory()),new Snap(old),new Snap(next),now);
assert.equal(permitted(good),true);
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
console.log('PASS: live transaction simulation, late extension, pause/resume, repeat undo, settlement without double debit, budget/identity/deadline checks, and 11 tampered-rule payloads rejected.');
})().catch(e=>{console.error(e);process.exitCode=1});
