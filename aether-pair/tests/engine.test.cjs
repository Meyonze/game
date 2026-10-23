const test=require('node:test'),assert=require('node:assert/strict'),E=require('../dist/engine.js');
function blank(){const s=E.create();s.tiles=[];s.enemies=[];s.units[0].x=3;s.units[0].y=5;s.units[1].x=6;s.units[1].y=5;return s;}
function enemy(s,type,x,y,hp){const e={id:'e'+s.enemies.length,type,x,y,hp:hp||E.TYPES[type].hp,maxHp:hp||E.TYPES[type].hp,intent:null};s.enemies.push(e);E.planEnemies(s);return e;}
const guard=(u,x=u.x,y=u.y)=>({unitId:u.id,x,y,skill:'guard'});
test('all six deployments use legal distinct cells and deterministic intentions',()=>{
  for(let i=0;i<6;i++){const s=E.create(i),all=[...s.units,...s.enemies,s.objective];assert.equal(new Set(all.map(e=>E.key(e.x,e.y))).size,all.length);assert(all.every(e=>E.inside(e.x,e.y)&&E.tileAt(s,e.x,e.y)!=='wall'));assert.deepEqual(s,E.create(i));assert(E.restore(E.save(s)));}
});
test('movement is a three-step path around walls and enemies, without sharing an ending cell',()=>{
  const s=blank();s.tiles=[{x:3,y:4,kind:'wall'}];enemy(s,'talon',2,5);const moves=E.reachable(s,'aster');assert(!moves.some(p=>p.x===3&&p.y===4));assert(!moves.some(p=>p.x===2&&p.y===5));assert(!moves.some(p=>p.x===6&&p.y===5));assert(moves.every(p=>p.path.length<=3));assert(moves.some(p=>p.x===4&&p.y===3));
});
test('each unit acts once and a single reservation never advances the real round',()=>{
  const s=E.create(),before=JSON.stringify(s);E.playerPlan(s,[guard(s.units[0])]);assert.equal(JSON.stringify(s),before);assert.throws(()=>E.resolve(s,[guard(s.units[0])]));assert.throws(()=>E.resolve(s,[guard(s.units[0]),guard(s.units[0])]));assert.equal(s.round,1);
});
test('an ally can move into the first ally’s vacated cell in the reserved order',()=>{
  const s=blank();s.units[1].x=4;s.units[1].y=5;enemy(s,'talon',0,0);const orders=[guard(s.units[0],3,4),guard(s.units[1],3,5)];const r=E.playerPlan(s,orders);assert.equal(r.state.units[1].x,3);assert.equal(r.state.units[1].y,5);assert.throws(()=>E.playerPlan(s,[orders[1],orders[0]]));
});
test('opposite-side crossfire deals seven, ignores armor and records the combo',()=>{
  const s=blank(),e=enemy(s,'bulwark',4,5);const order={unitId:'lumiere',x:6,y:5,skill:'attack',targetId:e.id};assert(E.comboReady(s,s.units[1],e));const r=E.playerPlan(s,[order]);assert.equal(r.state.enemies[0].hp,2);assert.equal(r.state.combos,1);assert(r.events.some(e=>e.kind==='combo'));
  s.units[0].x=5;assert(!E.comboReady(s,s.units[1],e));const normal=E.playerPlan(s,[order]);assert.equal(normal.state.enemies[0].hp,7);
});
test('push changes the enemy origin while a blocked push adds two collision damage',()=>{
  const s=blank(),e=enemy(s,'bulwark',3,4);const order={unitId:'aster',x:3,y:5,skill:'special',targetId:e.id};let r=E.playerPlan(s,[order]);assert.equal(r.state.enemies[0].y,3);assert.equal(r.state.enemies[0].hp,8);
  s.tiles=[{x:3,y:3,kind:'wall'}];r=E.playerPlan(s,[order]);assert.equal(r.state.enemies[0].y,4);assert.equal(r.state.enemies[0].hp,6);assert(r.events.some(e=>e.kind==='collision'));
});
test('enemy fire can kill another enemy before its action, cancelling that action',()=>{
  const s=blank();s.units[0].x=0;s.units[0].y=8;s.units[1].x=8;s.units[1].y=9;const gun=enemy(s,'lancer',0,2),victim=enemy(s,'talon',0,5,3);gun.intent={kind:'ray',dx:0,dy:1,targetName:'アステル'};
  const r=E.simulate(s,s.units.map(u=>guard(u)));assert.equal(r.state.enemies[1].hp,0);assert(!r.events.some(e=>e.kind==='enemyAttack'&&e.id===victim.id));assert.equal(r.state.friendlyKills,1);
});
test('killing a shooter cancels its incoming attack',()=>{
  const s=blank();const gun=enemy(s,'lancer',3,4,3);gun.intent={kind:'ray',dx:0,dy:1,targetName:'アステル'};const r=E.simulate(s,[{unitId:'aster',x:3,y:5,skill:'attack',targetId:gun.id},guard(s.units[1])]);assert.equal(r.damage.aster,0);assert.equal(r.state.phase,'won');
});
test('guard and cover protect both pilot and adjacent beacon without granting invulnerability',()=>{
  const s=blank();s.objective.x=4;s.objective.y=5;const gun=enemy(s,'lancer',4,1);gun.intent={kind:'ray',dx:0,dy:1,targetName:'風見灯'};const r=E.simulate(s,s.units.map(u=>guard(u)));assert.equal(r.damage.beacon,1);
  s.units[0].x=2;const unprotected=E.simulate(s,s.units.map(u=>guard(u)));assert.equal(unprotected.damage.beacon,3);
});
test('piercing shots damage a friendly unit in the ray and the forecast includes it',()=>{
  const s=blank();s.units[1].x=1;s.units[0].x=3;const e=enemy(s,'bulwark',4,5);const r=E.playerPlan(s,[{unitId:'lumiere',x:1,y:5,skill:'special',targetId:e.id}]);assert.equal(r.state.units[0].hp,9);assert.equal(r.state.enemies[0].hp,7);
});
test('the locked enemy aim remains fixed after a player moves away',()=>{
  const s=blank(),e=enemy(s,'cannon',3,0);e.intent={kind:'shell',target:{x:3,y:5},targetName:'アステル'};const r=E.simulate(s,[guard(s.units[0],1,5),guard(s.units[1])]);assert.equal(r.damage.aster,0);assert(r.telegraphs[0].cells.some(p=>p.x===3&&p.y===5));
});
test('forecast and execution agree, including sequential friendly fire, on every initial mission',()=>{
  for(let i=0;i<6;i++){const s=E.create(i),orders=s.units.map(u=>guard(u));const f=E.forecast(s,orders),r=E.resolve(s,orders);assert.deepEqual(f.damage,r.damage);assert.equal(f.state.objective.hp,r.state.objective.hp);assert.deepEqual(f.state.units.map(u=>u.hp),r.state.units.map(u=>u.hp));assert.equal(f.kills,r.kills);assert.equal(f.state.phase,r.state.phase);}
});
test('a draft preview changes neither reservations nor the actual battle',()=>{
  const s=E.create(),before=JSON.stringify(s),orders=[];const f=E.forecast(s,orders,{unitId:'aster',x:3,y:6});assert.equal(f.display.units[0].y,6);assert.equal(JSON.stringify(s),before);assert.deepEqual(orders,[]);
});
test('either pilot loss or beacon loss is defeat, and boss defeat clears surviving enemies',()=>{
  const s=blank();s.units[0].hp=0;enemy(s,'talon',0,0);assert.equal(E.simulate(s,[]).state.phase,'lost');s.units[0].hp=12;s.objective.hp=0;assert.equal(E.simulate(s,[]).state.phase,'lost');
  const b=blank(),boss=enemy(b,'boss',3,4,3);enemy(b,'talon',0,0);const r=E.simulate(b,[{unitId:'aster',x:3,y:5,skill:'attack',targetId:boss.id}]);assert.equal(r.state.phase,'won');assert(r.state.enemies[1].hp>0);
});
test('storm cells resolve after enemy actions and can decide the battle',()=>{
  const s=blank();s.tiles=[{x:3,y:5,kind:'storm'}];enemy(s,'talon',0,0);const r=E.simulate(s,[]);assert.equal(r.damage.aster,2);assert(r.events.some(e=>e.source==='storm'));
});
test('saved rounds restore safely and malformed saves are rejected',()=>{
  const s=E.resolve(E.create(),E.create().units.map(u=>guard(u))).state,restored=E.restore(E.save(s));assert(restored);assert.equal(restored.round,s.round);assert.deepEqual(restored.units,s.units);
  for(const change of [r=>r.state.round=-1,r=>r.state.units[0].x=100,r=>r.state.units[0].hp=999,r=>r.state.tiles=[],r=>r.state.enemies[0].type='script']){const record=E.save(s);change(record);assert.equal(E.restore(record),null);}
});
