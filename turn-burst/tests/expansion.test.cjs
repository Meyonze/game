const test=require('node:test'),assert=require('node:assert/strict');
const {Game,UPGRADES,STAGES,BOSS_NAMES}=require('../dist/engine.js');
const boot=require('./harness.cjs');
function empty(){const g=new Game(12);g.enemies=[];g.spawnWave=()=>{};g.spawnMedkit=()=>{};return g;}

test('clearing a sector pauses for supplies and preserves the build into the next sector',()=>{
  const g=empty();g.weapons.blast=1;g.player.hp=3;g.sectorIndex=1;g.sectorTurn=9;g.clearSector();
  assert.equal(g.phase,'rest');assert.equal(g.clearedSectors,2);assert.equal(g.step(3,4),false);
  const score=g.score,xp=g.xpLevel,kills=g.kills;g.nextSector();assert.equal(g.sector,3);assert.equal(g.sectorTurn,0);assert.equal(g.player.hp,8);assert.equal(g.weapons.blast,1);assert.equal(g.score,score);assert.equal(g.kills,kills);assert.equal(g.phase,'upgrade');assert(g.pendingBonus);
  g.choose(g.offers[0]);assert.equal(g.xpLevel,xp,'supply upgrade does not consume kill XP');assert.equal(g.bonusUpgrades,0);assert.equal(g.phase,'play');
});
test('mid-boss defeat clears its sector while the final boss ends the campaign',()=>{
  for(const index of [1,3,4,6,8,9,11,13,14,16,18,19]){const g=empty();g.sectorIndex=index;const b=g.addEnemy(3,2,'boss');b.hp=1;b.intent={kind:'boss',cells:[{x:3,y:4}]};g.step(3,4);assert.equal(g.bossesDefeated,1);assert.equal(g.phase,index===19?'won':'rest');assert.equal(g.player.hp,8);}
});
test('runner advances two cells toward its locked target',()=>{
  const g=empty(),r=g.addEnemy(0,3,'runner');g.planEnemies();assert.deepEqual({x:r.intent.x,y:r.intent.y},{x:2,y:5});g.step(4,5);assert.equal(r.x,2);assert.equal(r.y,5);
});
test('splitter releases two live enemies without granting them an immediate attack',()=>{
  const g=empty(),e=g.addEnemy(3,3,'splitter');e.hp=1;g.planEnemies();g.step(3,5);
  assert.equal(g.lastKills,1);assert.equal(g.enemies.length,2);assert(g.enemies.every(e=>e.type==='mite'));assert.equal(g.player.hp,8);assert(g.enemies.every(e=>e.intent));
});
test('frost interrupts a surviving normal enemy but never cancels a boss attack',()=>{
  const g=empty();g.weapons.frost=2;const e=g.addEnemy(3,3,'brute');e.hp=e.maxHp=10;e.intent={kind:'shot',cells:[{x:3,y:5}]};g.step(3,5);assert.equal(g.player.hp,8);assert.equal(e.frozen,1);assert(g.events.some(e=>e.type==='freeze'));
  const b=empty();b.weapons.frost=2;const boss=b.addEnemy(3,2,'boss');boss.intent={kind:'boss',cells:[{x:3,y:4}]};b.step(3,4);assert.equal(b.player.hp,6);assert(!boss.frozen);
});
test('meteor targets the strongest enemy and hits its nearby group',()=>{
  const g=empty();g.weapons.meteor=1;g.turn=2;const strong=g.addEnemy(6,0,'brute');strong.hp=strong.maxHp=8;g.addEnemy(5,0);g.planEnemies();g.step(3,5);assert.equal(strong.hp,5);assert.equal(g.lastKills,1);assert(g.events.some(e=>e.type==='meteor'&&e.x===6&&e.y===0));
});
test('fire lasts three actions, refreshes instead of duplicating, and never damages its owner',()=>{
  const g=empty();g.weapons.flame=1;g.step(3,5);assert.equal(g.fires[0].until,3);g.step(4,5);g.step(5,5);assert(g.fires.some(f=>f.x===3&&f.y===5));g.step(6,5);assert(!g.fires.some(f=>f.x===3&&f.y===5));g.step(6,5);assert.equal(g.fires.filter(f=>f.x===6&&f.y===5).length,1);assert.equal(g.player.hp,8);
});
test('awakenings unlock in sector six and produce distinct upgraded attacks',()=>{
  const g=new Game(3);g.weapons.cross=3;g.turn=2;assert.equal(g.attackCells(3,4).beams.length,8);
  for(const u of UPGRADES)g.weapons[u.id]=u.max;g.weapons.blast=2;g.kills=100;g.experience=100;g.level=10;
  g.checkUpgrade();assert.equal(g.phase,'play','LV.3 not offered in early sectors');g.sectorIndex=5;g.checkUpgrade();assert.equal(g.phase,'upgrade');assert.deepEqual(g.offers,['blast']);g.choose('blast');assert.equal(g.weapons.blast,3);
});
test('boss variants have different health, names and telegraphed patterns',()=>{
  const patterns=[];
  for(const index of [1,3,4]){const g=empty();g.sectorIndex=index;g.sectorTurn=12;g.spawnBoss();const b=g.enemies[0];assert(BOSS_NAMES[b.variant]);assert(b.hp>=60);g.sectorTurn++;g.planEnemies();patterns.push(JSON.stringify(b.intent.cells));}
  assert.equal(new Set(patterns).size,3);assert.equal(STAGES.length,20);
});
test('save and resume retain RNG and preview results across play, upgrades and sector breaks',()=>{
  const g=new Game(123);const restored=Game.restore(g.save());assert(restored);assert.deepEqual(restored.preview(3,4),g.preview(3,4));restored.step(3,4);g.step(3,4);assert.equal(restored.seed,g.seed);assert.deepEqual(restored.enemies,g.enemies);
  assert.equal(g.phase,'upgrade');assert.equal(Game.restore(g.save()).phase,'upgrade');
  const rest=empty();rest.clearSector();const resumed=Game.restore(rest.save());assert.equal(resumed.phase,'rest');assert(resumed.nextSector());assert.equal(resumed.sector,2);
  for(const invalid of [null,{}, {version:1,state:{}},{version:2,state:{...g.save().state,sectorIndex:20}},{version:2,state:{...g.save().state,player:{x:3,y:5,hp:-1}}}])assert.equal(Game.restore(invalid),null);
});
test('sector screen grants supplies, opens its upgrade choice and stays within the existing arena',()=>{
  const h=boot();h.click('start');const dims=h.debug().canvas;h.game.sectorTurn=9;h.game.enemies=[];h.game.addEnemy(3,4);h.game.experience=5;h.tap(3,4);h.tick(850);assert.equal(h.game.phase,'rest');assert(!h.$('rest-screen').hidden);h.tap(3,3);assert.equal(h.game.turn,1);h.click('next-sector');assert(h.$('rest-screen').hidden);assert(!h.$('upgrade-screen').hidden);assert.equal(h.game.sector,2);assert.equal(JSON.stringify(h.debug().canvas),JSON.stringify(dims));
});
test('reload offers continue and resumes an earned upgrade without losing progress',()=>{
  const h=boot();h.click('start');h.tap(3,4);h.tick(850);const save=h.storage.get('turn-burst-run-v2');assert(save);const resumed=boot({initialStorage:[['turn-burst-run-v2',save]]});assert(!resumed.$('continue').hidden);resumed.click('continue');assert(resumed.$('start-screen').hidden);assert.equal(resumed.debug().turn,1);assert.equal(resumed.debug().phase,'upgrade');assert(!resumed.$('upgrade-screen').hidden);resumed.choose('blast');assert.equal(resumed.debug().weapons.blast,1);
});
