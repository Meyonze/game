const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../dist/engine.js');
test('overlapping attacks cost at most two HP and medkits recover four',()=>{
  const g=new Game(1);g.enemies=[];
  for(const x of [0,1,6]){const e=g.addEnemy(x,0,'gunner');e.intent={kind:'shot',cells:[{x:3,y:5}]};}
  g.step(3,5);assert.equal(g.player.hp,6);assert.equal(g.events.find(e=>e.type==='hurt').amount,2);
  g.enemies=[];g.player.hp=1;g.pickups=[{x:3,y:5}];g.step(3,5);assert.equal(g.player.hp,5);assert.equal(g.events.find(e=>e.type==='heal').amount,4);
});
test('moving to the next sector restores all lost HP',()=>{
  const g=new Game(2);g.phase='rest';g.player.hp=1;g.player.maxHp=12;g.nextSector();assert.equal(g.player.hp,12);
});
test('older saves receive the easing once, without repeating health or enemy scaling on reload',()=>{
  const g=new Game(3);g.enemies=[];g.player.hp=2;g.score=1234;
  const e=g.addEnemy(0,0,'brute');e.hp=e.maxHp=20;g.planEnemies();
  const old=g.save();delete old.state.balanceVersion;
  const migrated=Game.restore(old);assert(migrated);assert.equal(migrated.player.hp,8);assert.equal(migrated.enemies[0].hp,16);assert.equal(migrated.score,1234);
  migrated.player.hp=3;migrated.enemies[0].hp=10;
  const again=Game.restore(migrated.save());assert(again);assert.equal(again.player.hp,3);assert.equal(again.enemies[0].hp,10);assert.equal(again.enemies[0].maxHp,16);
});
test('bosses have a visible attack break every fourth turn',()=>{
  const g=new Game(4);g.enemies=[];g.sectorIndex=1;g.spawnBoss();const b=g.enemies[0];b.bornTurn=0;
  g.sectorTurn=2;g.planEnemies();assert(b.intent.cells.length>0);
  g.sectorTurn=3;g.planEnemies();assert.equal(b.intent.cells.length,0);
  g.sectorTurn=4;g.planEnemies();assert(b.intent.cells.length>0);
});
