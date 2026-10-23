/* AETHER PAIR v3 — two activations, shared energy, visible enemy orders. */
(function(root){
'use strict';
const W=7,H=7,DIRS=[[0,-1],[-1,0],[1,0],[0,1]],copy=o=>JSON.parse(JSON.stringify(o));
const key=(x,y)=>x+','+y,inside=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<W&&y<H;
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const TYPES={talon:{name:'巡回ロボ',hp:3,damage:2},bulwark:{name:'重警備ロボ',hp:5,damage:3},boss:{name:'灯台の制御炉',hp:12,damage:3}};
const MISSIONS=[
 {name:'暴走灯台を止める',hint:'灯台の制御炉を壊せば勝利。警備ロボを片づけるか、灯台へ突破するか。',start:[[3,4],[3,5]],walls:[[2,2],[4,2]],enemies:[['bulwark',3,3],['talon',1,4],['talon',5,4],['boss',3,0]]},
 {name:'操作を練習',hint:'赤は隣、青は2〜4マス先を攻撃。移動だけでは行動を消費しません。',start:[[3,4],[3,5]],walls:[],enemies:[['talon',3,2],['talon',5,3]]}
];
const COST={attack:0,power:2,guard:0,combo:3};
const wall=(s,x,y)=>!inside(x,y)||s.tiles.some(p=>p.x===x&&p.y===y);
const alive=s=>[...s.units,...s.enemies].filter(e=>e.hp>0);
const occupied=(s,x,y,id)=>alive(s).some(e=>e.id!==id&&e.x===x&&e.y===y);
const available=s=>s.units.filter(u=>u.hp>0&&!s.acted.includes(u.id));
function create(mission=0){
 const m=MISSIONS[mission];if(!Number.isInteger(mission)||!m)throw Error('未知の戦場');
 const s={version:3,mission,round:1,phase:'play',energy:2,acted:[],combos:0,totalDamage:0,spent:0,guards:0,units:[
  {id:'aster',name:'トト',x:m.start[0][0],y:m.start[0][1],hp:9,maxHp:9,guard:false},
  {id:'lumiere',name:'ミオ',x:m.start[1][0],y:m.start[1][1],hp:6,maxHp:6,guard:false}
 ],enemies:m.enemies.map(([type,x,y],i)=>({id:'e'+i,type,x,y,hp:TYPES[type].hp,maxHp:TYPES[type].hp,plan:null})),tiles:m.walls.map(([x,y])=>({x,y,kind:'wall'}))};plan(s);return s;
}
function moves(s,id){
 const u=s.units.find(u=>u.id===id);if(s.phase!=='play'||!u||u.hp<=0||s.acted.includes(id))return [];
 const queue=[{x:u.x,y:u.y,path:[]}],seen=new Set([key(u.x,u.y)]);
 for(let i=0;i<queue.length;i++){const p=queue[i];if(p.path.length>=2)continue;
  for(const [dx,dy] of DIRS){const x=p.x+dx,y=p.y+dy,k=key(x,y);if(seen.has(k)||wall(s,x,y)||occupied(s,x,y,id))continue;seen.add(k);queue.push({x,y,path:[...p.path,{x,y}]});}
 }return queue;
}
function positioned(state,id,x,y){
 const p=moves(state,id).find(v=>v.x===x&&v.y===y);if(!p)throw Error('光る移動先を選んでください');
 const s=copy(state),u=s.units.find(v=>v.id===id);u.x=x;u.y=y;return s;
}
// A shot can arc over units; walls obstruct a straight shot. Range is taxicab distance.
function inRange(s,u,e){
 const d=distance(u,e);if(u.id==='aster')return d===1;
 if(d<2||d>4)return false;
 if(u.x===e.x||u.y===e.y){const dx=Math.sign(e.x-u.x),dy=Math.sign(e.y-u.y);for(let n=1;n<d;n++)if(wall(s,u.x+dx*n,u.y+dy*n))return false;}
 return true;
}
function targets(s,id,kind='attack'){
 const u=s.units.find(v=>v.id===id);if(!u||s.phase!=='play'||s.acted.includes(id)||!(kind in COST)||s.energy<COST[kind]||kind==='guard')return [];
 if(kind==='combo'){
  if(s.acted.length)return [];
  const a=s.units[0],b=s.units[1];return s.enemies.filter(e=>e.hp>0&&distance(a,e)===1&&inRange(s,b,e));
 }return s.enemies.filter(e=>e.hp>0&&inRange(s,u,e));
}
function plan(s){
 for(const e of s.enemies.filter(e=>e.hp>0)){
  if(e.type==='boss'){
   const u=s.units[1].hp>0?s.units[1]:s.units[0],dx=u.x-e.x,dy=u.y-e.y;
   e.plan={dx:Math.abs(dx)>Math.abs(dy)?Math.sign(dx):0,dy:Math.abs(dx)>Math.abs(dy)?0:Math.sign(dy)||1};
  }else{
   const adjacent=s.units.some(u=>u.hp>0&&distance(e,u)===1);
   const target=s.units[1].hp>0?s.units[1]:s.units[0];
   const opts=DIRS.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy})).filter(p=>!wall(s,p.x,p.y)&&!s.enemies.some(v=>v.hp>0&&v.id!==e.id&&v.x===p.x&&v.y===p.y));
   opts.sort((a,b)=>distance(a,target)-distance(b,target));
   e.plan=adjacent||!opts[0]||distance(opts[0],target)>=distance(e,target)?{x:e.x,y:e.y}:opts[0];
  }
 }
}
function cells(s,e){
 if(e.type==='boss'){
  const out=[];for(let n=1;n<Math.max(W,H);n++){const x=e.x+e.plan.dx*n,y=e.y+e.plan.dy*n;if(wall(s,x,y))break;out.push({x,y});if(occupied(s,x,y,e.id))break;}return out;
 }
 return DIRS.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy})).filter(p=>!wall(s,p.x,p.y));
}
function shield(s,u){return u.guard||s.units[0].hp>0&&s.units[0].guard&&distance(s.units[0],u)===1?1:0;}
function hit(s,e,n,events,source){
 const amount=Math.min(e.hp,Math.max(0,n));if(!amount)return;e.hp-=amount;
 if(s.units.some(u=>u.id===e.id))s.totalDamage+=amount;
 events.push({kind:'hit',id:e.id,x:e.x,y:e.y,amount,source,text:'−'+amount});if(!e.hp)events.push({kind:'down',id:e.id,x:e.x,y:e.y});
}
function finish(s){
 if(s.units.some(u=>u.hp<=0)){s.phase='lost';return true;}
 const boss=s.enemies.find(e=>e.type==='boss');if(boss?boss.hp<=0:s.enemies.every(e=>e.hp<=0)){s.phase='won';return true;}return false;
}
// The forecast and the real enemy turn run the exact same deterministic resolver.
function enemyTurn(state){
 const s=copy(state),events=[],threats=[];
 for(const e of s.enemies){if(e.hp<=0)continue;const from={x:e.x,y:e.y};
  if(e.type!=='boss'&&!occupied(s,e.plan.x,e.plan.y,e.id)){e.x=e.plan.x;e.y=e.plan.y;if(e.x!==from.x||e.y!==from.y)events.push({kind:'move',id:e.id,from,to:{x:e.x,y:e.y}});}
  const area=cells(s,e),n=TYPES[e.type].damage;
  threats.push({id:e.id,from,to:{x:e.x,y:e.y},cells:area,damage:n});events.push({kind:'enemyAttack',id:e.id,from:{x:e.x,y:e.y},cells:area});
  for(const u of s.units)if(u.hp>0&&area.some(p=>p.x===u.x&&p.y===u.y))hit(s,u,n-shield(s,u),events,'enemy');
  // The core's beam hits the first body, including its own defenders.
  if(e.type==='boss')for(const other of s.enemies)if(other.hp>0&&other.id!==e.id&&area.some(p=>p.x===other.x&&p.y===other.y))hit(s,other,n,events,'enemy');
  if(s.units.some(u=>u.hp<=0))break;
 }
 finish(s);return {state:s,events,threats,damage:s.units.map((u,i)=>state.units[i].hp-u.hp)};
}
function forecast(s){return enemyTurn(s);}
function threats(s){return forecast(s).threats;}
function action(state,id,x,y,kind,targetId=null){
 if(!(kind in COST))throw Error('未知の行動');
 const s=positioned(state,id,x,y),unit=s.units.find(u=>u.id===id),before=state.units.find(u=>u.id===id),events=[],frames=[];
 if(s.energy<COST[kind])throw Error('共有バッテリーが足りません');
 const enemy=s.enemies.find(e=>e.id===targetId);
 if(kind!=='guard'&&!targets(s,id,kind).some(e=>e.id===targetId))throw Error(kind==='combo'?'連携には未行動の2匹と、赤の隣・青の射程内の敵が必要です':'射程内の敵を選んでください');
 if(before.x!==x||before.y!==y)events.push({kind:'move',id,from:{x:before.x,y:before.y},to:{x,y}});
 s.energy-=COST[kind];s.spent+=COST[kind];
 if(kind==='guard'){
  unit.guard=true;s.energy=Math.min(5,s.energy+1);s.guards++;events.push({kind:'guard',id,x,y});
 }else{
  const affected=kind==='power'&&id==='aster'?s.enemies.filter(e=>e.hp>0&&distance(e,unit)===1):[enemy];
  for(const target of affected){events.push({kind:kind==='combo'?'combo':'attack',id:target.id,from:{x,y},to:{x:target.x,y:target.y},ally:kind==='combo'?{x:s.units.find(u=>u.id!==id).x,y:s.units.find(u=>u.id!==id).y}:null});hit(s,target,kind==='combo'?8:kind==='power'?(id==='aster'?3:4):2,events,'player');}
  if(kind==='combo')s.combos++;
 }
 s.acted=kind==='combo'?s.units.map(u=>u.id):[...s.acted,id];
 finish(s);frames.push({state:copy(s),events:copy(events),kind:'player',label:kind==='guard'?'守ってためる ＋1':kind==='combo'?'コンビ技 8 DAMAGE':kind==='power'?(id==='aster'?'周囲を薙ぎ払う':'チャージ砲'):'攻撃'});
 if(s.phase==='play'&&s.acted.length===2){
  const r=enemyTurn(s);Object.assign(s,r.state);events.push(...r.events);frames.push({state:copy(s),events:r.events,kind:'enemy',label:'敵の番'});
  if(s.phase==='play'){s.round++;s.acted=[];s.energy=Math.min(5,s.energy+2);s.units.forEach(u=>u.guard=false);plan(s);frames.push({state:copy(s),events:[],kind:'next',label:'TURN '+s.round+' · バッテリー ＋2'});}
 }
 return {state:s,frames,events,kills:state.enemies.filter(e=>e.hp>0&&!s.enemies.some(v=>v.id===e.id&&v.hp>0)).length};
}
function options(s,id){
 const out=[];for(const p of moves(s,id)){const staged=positioned(s,id,p.x,p.y);out.push({id,x:p.x,y:p.y,kind:'guard',target:null});for(const kind of ['attack','power','combo'])for(const e of targets(staged,id,kind))out.push({id,x:p.x,y:p.y,kind,target:e.id});}return out;
}
function save(s){return {version:3,state:copy(s)};}
function restore(data){
 try{
  if(data?.version!==3||data.state?.version!==3)return null;const s=copy(data.state),base=create(s.mission),int=n=>Number.isSafeInteger(n)&&n>=0;
  if(!int(s.round)||s.round<1||!int(s.energy)||s.energy>5||!['play','won','lost'].includes(s.phase)||!['combos','totalDamage','spent','guards'].every(k=>int(s[k])))return null;
  if(!Array.isArray(s.acted)||s.acted.length>2||new Set(s.acted).size!==s.acted.length||s.acted.some(id=>!base.units.some(u=>u.id===id))||(s.phase==='play'&&s.acted.length>1))return null;
  const valid=(e,b)=>e&&e.id===b.id&&e.maxHp===b.maxHp&&int(e.hp)&&e.hp<=e.maxHp&&inside(e.x,e.y);
  if(s.units?.length!==2||s.units.some((u,i)=>!valid(u,base.units[i])||typeof u.guard!=='boolean'||u.name!==base.units[i].name))return null;
  if(s.enemies?.length!==base.enemies.length||s.enemies.some((e,i)=>!valid(e,base.enemies[i])||e.type!==base.enemies[i].type||!e.plan||(e.type==='boss'?!DIRS.some(([dx,dy])=>dx===e.plan.dx&&dy===e.plan.dy):!inside(e.plan.x,e.plan.y)||distance(e,e.plan)>1)))return null;
  if(JSON.stringify(s.tiles)!==JSON.stringify(base.tiles)||alive(s).some(e=>wall(s,e.x,e.y))||new Set(alive(s).map(e=>key(e.x,e.y))).size!==alive(s).length)return null;
  const checked=copy(s);checked.phase='play';finish(checked);if(checked.phase!==s.phase)return null;
  return s;
 }catch{return null;}
}
const API={W,H,DIRS,TYPES,MISSIONS,COST,copy,key,inside,distance,create,available,moves,positioned,inRange,targets,forecast,threats,action,options,save,restore,wall};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.AetherPair=API;
})(typeof window!=='undefined'?window:globalThis);
