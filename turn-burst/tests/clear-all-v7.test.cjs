const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../dist/engine.js'),boot=require('./harness.cjs');
function empty(){const g=new Game(75);g.enemies=[];return g;}
function bossAndStraggler(final=false){
  const g=empty();g.sectorIndex=final?19:1;g.bossSpawned=true;
  const b=g.addEnemy(3,2,'boss');b.hp=1;b.intent={kind:'boss',cells:[{x:3,y:4}]};
  const e=g.addEnemy(0,0,'brute');e.hp=1;e.intent={kind:'shot',cells:[{x:3,y:4}]};return{g,e};
}
test('reinforcement deadline stops spawns but does not clear live enemies',()=>{
  const g=empty();g.sectorTurn=9;const e=g.addEnemy(0,0,'brute');e.hp=e.maxHp=1000;e.intent={kind:'shot',cells:[]};const nextId=g.nextId;
  g.step(3,5);assert.equal(g.phase,'play');assert(g.reinforcementsOver);assert.equal(g.nextId,nextId);assert.equal(g.enemies.length,1);
  g.step(3,5);assert.equal(g.nextId,nextId);assert.equal(g.phase,'play');
  e.x=3;e.y=4;e.hp=1;e.intent={kind:'shot',cells:[]};g.step(3,5);assert.equal(g.phase,'rest');assert.equal(g.enemies.length,0);
});
test('boss defeat immediately clears its sector and disables stragglers without a second kill reward',()=>{
  const {g,e}=bossAndStraggler();g.player.hp=1;const nextId=g.nextId;
  g.step(3,4);assert.equal(g.phase,'rest');assert(g.reinforcementsOver);assert.equal(g.enemies.length,0);assert.equal(g.bossesDefeated,1);assert.equal(g.nextId,nextId);assert.equal(g.player.hp,1);
  assert(g.events.some(v=>v.type==='disabled'&&v.id===e.id));assert.equal(g.lastKills,1);assert.equal(g.experience,5);
  const score=g.score;assert.equal(g.step(3,4),false);assert.equal(g.clearSector(),false);assert.equal(g.score,score);assert.equal(g.bossesDefeated,1);
});
test('a final splitter leaves its children to be cleared',()=>{
  const g=empty();g.sectorTurn=9;const e=g.addEnemy(3,4,'splitter');e.hp=1;e.intent={kind:'shot',cells:[]};g.step(3,5);
  assert(g.reinforcementsOver);assert.equal(g.phase,'play');assert.equal(g.enemies.length,2);assert(g.enemies.every(e=>e.summoned));
});
test('victory follows the final boss defeat even with live remaining enemies',()=>{
  const {g}=bossAndStraggler(true);g.bossesDefeated=11;g.step(3,4);
  assert.equal(g.phase,'won');assert.equal(g.enemies.length,0);assert.equal(g.bossesDefeated,12);assert.equal(g.lastKills,1);
});
test('an old boss cleanup save migrates to a cleared sector without counting the boss again',()=>{
  const {g,e}=bossAndStraggler();g.step(3,4);const record=g.save();record.version=3;
  record.state.phase='play';record.state.enemies=[e];record.state.clearedSectors=0;record.state.score=1234;
  for(const id of ['coreburst','coreguard','coresalvage'])delete record.state.weapons[id];
  const r=Game.restore(record);assert(r);assert.equal(r.phase,'rest');assert.equal(r.bossesDefeated,1);assert.equal(r.enemies.length,0);
  const score=r.score;const again=Game.restore(r.save());assert(again);assert.equal(again.score,score);assert.equal(again.bossesDefeated,1);
});
test('clearSector cannot discard live enemies',()=>{
  const g=new Game(6);assert.equal(g.clearSector(),false);assert.equal(g.phase,'play');assert(g.enemies.length>0);assert.equal(g.clearedSectors,0);
});
test('boss arrival moves surrounding enemies aside instead of deleting them',()=>{
  const g=empty();g.sectorIndex=1;for(const y of [0,1,2])g.addEnemy(3,y);
  const ids=g.enemies.map(e=>e.id);g.spawnBoss();const b=g.enemies.find(e=>e.type==='boss');
  assert.equal(g.enemies.length,4);assert(ids.every(id=>g.enemies.some(e=>e.id===id)));assert(g.enemies.filter(e=>e.type!=='boss').every(e=>!g.enemyAt(b,e.x,e.y)));
});
test('the HUD explains cleanup and displays the remaining enemy count',()=>{
  const h=boot();h.click('start');h.game.enemies=[];const e=h.game.addEnemy(0,0,'brute');e.hp=e.maxHp=1000;e.intent={kind:'shot',cells:[]};h.game.turn=9;h.game.sectorTurn=9;
  h.tap(3,5);h.tick(850);assert.equal(h.game.phase,'play');assert.equal(h.$('turn').textContent,'残り 1体');assert(h.$('hint').textContent.includes('残り1体を倒せばクリア'));assert(h.$('rest-screen').hidden);
});
