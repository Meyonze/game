const test=require('node:test'),assert=require('node:assert/strict');
const {Game,UPGRADES,STAGES}=require('../dist/engine.js');
const {play}=require('./balance-simulation.cjs');
const boot=require('./harness.cjs');
function empty(){const g=new Game(71);g.enemies=[];g.spawnWave=()=>{};g.spawnMedkit=()=>{};return g;}

test('four weapon families remain distinct while support upgrades use no weapon slot',()=>{
  const g=empty();g.sectorIndex=11;
  for(const id of ['blast','cross','lance','pulse']){g.phase='upgrade';g.offers=[id];assert(g.choose(id));}
  assert.equal(g.ownedWeapons.length,4);assert(!g.canUpgrade('drone'));assert(g.canUpgrade('blast'));assert(g.canUpgrade('armor'));assert(g.canUpgrade('overclock'));
  g.phase='upgrade';g.offers=['drone'];assert.equal(g.choose('drone'),false);
  g.offers=['armor'];assert(g.choose('armor'));assert.equal(g.ownedWeapons.length,4);
});
test('boss weak sides reward positioning and never point outside the board',()=>{
  const totals=[];
  for(const side of ['S','N']){const g=empty(),b=g.addEnemy(3,2,'boss');b.weakSide=side;b.intent={kind:'boss',cells:[]};g.step(3,4);totals.push(b.maxHp-b.hp);}
  assert(totals[0]>totals[1]*2);
  for(const y of [1,7]){const g=empty();g.sectorIndex=19;const b=g.addEnemy(3,y,'boss');b.variant='origin';b.bornTurn=0;for(let t=0;t<12;t++){g.sectorTurn=t;g.planEnemies();assert.notEqual(b.weakSide,y===1?'N':'S');}}
});
test('frost allows two enemy turns between freezes instead of permanent stun',()=>{
  const g=empty();g.weapons.frost=1;const e=g.addEnemy(3,4,'brute');e.hp=e.maxHp=100;
  const hurt=[];for(let i=0;i<4;i++){e.intent={kind:'shot',cells:[{x:3,y:5}]};g.step(3,5);hurt.push(g.events.some(e=>e.type==='hurt'));}
  assert.deepEqual(hurt,[false,true,true,false]);
});
test('warders resist explosion and fire, cannot freeze, and remain vulnerable to direct fire',()=>{
  const g=empty();g.weapons.frost=2;g.explosions=[];const e=g.addEnemy(1,1,'warder');e.hp=e.maxHp=100;
  g.hit(e,6,0,'blast');assert.equal(e.hp,98);g.hit(e,6,0,'fire');assert.equal(e.hp,96);g.hit(e,6);assert.equal(e.hp,90);assert(!e.frozen);
});
test('automated support attacks have predictable reload turns',()=>{
  const g=empty();g.weapons.arc=1;g.weapons.drone=1;g.weapons.meteor=1;const e=g.addEnemy(5,3,'brute');e.hp=e.maxHp=100;
  for(let i=1;i<=3;i++){e.intent={kind:'shot',cells:[]};g.step(3,5);assert.equal(g.events.some(e=>e.type==='arc'),i===2);assert.equal(g.events.some(e=>e.type==='drone'),i===2);assert.equal(g.events.some(e=>e.type==='meteor'),i===3);}
});
test('split offspring give score but cannot be farmed for upgrade XP',()=>{
  const g=empty();const e=g.addEnemy(3,4);e.summoned=true;e.intent={kind:'shot',cells:[]};g.step(3,5);assert.equal(g.kills,1);assert(g.score>0);assert.equal(g.experience,0);
});
test('legacy weapons and progress survive migration, including old oversized loadouts',()=>{
  const g=empty();g.sectorIndex=9;g.phase='rest';g.score=123456;g.player.hp=5;
  for(const u of UPGRADES)g.weapons[u.id]=u.id==='overclock'?6:u.max;
  const record=g.save();record.version=2;delete record.state.slotLimit;delete record.state.experience;
  const restored=Game.restore(record);assert(restored);assert.equal(restored.score,123456);assert.equal(restored.player.hp,5);assert.equal(restored.slotLimit,9);assert.equal(restored.ownedWeapons.length,9);assert.equal(restored.weapons.overclock,3);assert(restored.nextSector());assert.equal(restored.sector,11);
});
test('a late full-strength build still needs movement and can win when played tactically',()=>{
  const g=new Game(99);g.sectorIndex=9;g.phase='rest';for(const id of ['blast','cross','pulse','lance'])g.weapons[id]=3;
  g.weapons.armor=2;g.player.hp=g.player.maxHp=12;g.level=14;g.xpLevel=9;g.experience=800;g.nextSector();
  const still=play(99,'blast','still',g.clone()),tactical=play(99,'blast','tactical',g.clone());assert.equal(still.phase,'lost');assert.equal(tactical.phase,'won');assert.equal(tactical.sector,20);assert.equal(STAGES.filter(s=>s.boss).length,12);
});
test('reload indicators and weapon capacity appear in the unchanged mobile arena',()=>{
  const h=boot();h.click('start');h.game.sectorIndex=19;h.game.enemies=[];h.game.weapons.arc=1;h.game.weapons.lance=3;h.game.player.y=5;
  h.game.addEnemy(3,1,'boss').variant='origin';h.game.planEnemies();h.tap(3,4);h.tick(850);
  assert(h.$('loadout').innerHTML.includes('武装 2/4'));assert(h.$('loadout').innerHTML.includes('準備OK'));assert(h.$('boss-name').textContent.includes('弱点'));assert(h.$('sector').innerHTML.startsWith('20/20'));
});
