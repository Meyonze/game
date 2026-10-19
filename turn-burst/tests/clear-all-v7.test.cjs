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
test('boss defeat stops reinforcements and counts once while stragglers remain',()=>{
  const {g,e}=bossAndStraggler();g.player.hp=1;const nextId=g.nextId;
  g.step(3,4);assert.equal(g.phase,'play');assert(g.reinforcementsOver);assert.equal(g.enemies.length,1);assert.equal(g.bossesDefeated,1);assert.equal(g.nextId,nextId);assert.equal(g.player.hp,1,'boss kill still cancels attacks on that turn');
  g.step(3,4);assert.equal(g.bossesDefeated,1);assert.equal(g.nextId,nextId);
  e.x=3;e.y=4;e.intent={kind:'shot',cells:[]};g.step(3,4);assert.equal(g.phase,'rest');assert.equal(g.bossesDefeated,1);
});
test('a final splitter leaves its children to be cleared',()=>{
  const g=empty();g.sectorTurn=9;const e=g.addEnemy(3,4,'splitter');e.hp=1;e.intent={kind:'shot',cells:[]};g.step(3,5);
  assert(g.reinforcementsOver);assert.equal(g.phase,'play');assert.equal(g.enemies.length,2);assert(g.enemies.every(e=>e.summoned));
});
test('victory requires defeating the final boss and every remaining enemy',()=>{
  const {g,e}=bossAndStraggler(true);g.bossesDefeated=11;g.step(3,4);assert.equal(g.phase,'play');assert.equal(g.bossesDefeated,12);
  e.x=3;e.y=4;e.intent={kind:'shot',cells:[]};g.step(3,4);assert.equal(g.phase,'won');assert.equal(g.enemies.length,0);assert.equal(g.bossesDefeated,12);
});
test('cleanup resumes from a save without re-spawning or re-counting the boss',()=>{
  const {g}=bossAndStraggler();g.step(3,4);const r=Game.restore(g.save());assert(r);assert(r.reinforcementsOver);const nextId=r.nextId;
  r.step(3,4);assert.equal(r.nextId,nextId);assert.equal(r.bossesDefeated,1);assert.equal(r.phase,'play');
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
