const test=require('node:test'),assert=require('node:assert/strict');
const {Game,UPGRADES,STAGES}=require('../dist/engine.js');
const boot=require('./harness.cjs');
function upgrade(){const h=boot();h.click('start');h.tap(3,4);h.tick(850);assert.equal(h.game.phase,'upgrade');return h;}

test('rapid taps immediately after the upgrade appears cannot choose any card',()=>{
  const h=upgrade();
  for(let i=0;i<5;i++){h.choiceDown('blast');h.choiceUp('blast');h.choiceClick('blast');h.tick(60);}
  assert.equal(h.game.level,0);assert.equal(h.game.weapons.blast,0);assert.equal(h.game.phase,'upgrade');
  h.tick(50);h.choiceDown('blast');h.choiceUp('blast');h.choiceClick('blast');assert.equal(h.game.level,1);
});
test('a press started during the protected interval stays rejected after the interval ends',()=>{
  const h=upgrade();h.tick(340);h.choiceDown('blast');h.tick(100);h.choiceUp('blast');h.choiceClick('blast');assert.equal(h.game.level,0);
  h.choiceDown('blast');h.choiceUp('blast');h.choiceClick('blast');assert.equal(h.game.level,1);
});
test('release or click carried from the battlefield cannot select a newly displayed upgrade',()=>{
  const h=boot();h.click('start');h.tap(3,4);h.down(3,3);h.tick(850);h.tick(550);
  h.choiceUp('blast');h.choiceClick('blast');assert.equal(h.game.level,0);
  h.choiceDown('blast');h.choiceUp('blast');h.choiceClick('blast');assert.equal(h.game.level,1);
});
test('dragging between cards, canceling a press, and secondary fingers cannot confirm it',()=>{
  const h=upgrade();h.tick(550);
  h.choiceDown('blast');h.choiceUp('cross');h.choiceClick('cross');assert.equal(h.game.level,0);
  h.choiceDown('blast');h.choiceCancel();h.choiceUp('blast');h.choiceClick('blast');assert.equal(h.game.level,0);
  h.choiceDown('cross',{pointerId:2,isPrimary:false});h.choiceUp('cross',{pointerId:2,isPrimary:false});h.choiceClick('cross');assert.equal(h.game.level,0);
  h.choose('cross');assert.equal(h.game.weapons.cross,1);
});
test('each consecutive earned upgrade has its own protected interval',()=>{
  const h=boot();h.click('start');h.game.kills=27;h.game.experience=54;h.tap(3,4);h.tick(850);h.choose('blast');assert.equal(h.game.level,1);assert.equal(h.game.phase,'upgrade');
  const id=h.game.offers[0];h.choiceDown(id);h.choiceUp(id);h.choiceClick(id);h.key('1');assert.equal(h.game.level,1);h.choose(id);assert.equal(h.game.level,2);
});
test('keyboard and accessible clicks work after protection ends, while early keys are ignored',()=>{
  const h=upgrade();h.key('1');h.choiceClick('blast',{detail:0});assert.equal(h.game.level,0);h.tick(550);h.key('1');assert.equal(h.game.level,1);
  const a=upgrade();a.tick(550);a.choiceClick('blast',{detail:0});assert.equal(a.game.level,1);
});
test('the twelfth sector unlocks the new power upgrade',()=>{
  const g=new Game(4);g.enemies=[];g.sectorIndex=11;
  const b=g.addEnemy(3,2,'boss');b.hp=1;b.intent={kind:'boss',cells:[]};g.step(3,4);assert.equal(g.phase,'rest');
  g.level=10;g.bonusUpgrades=1;g.phase='play';g.checkUpgrade();assert.equal(g.phase,'upgrade');assert(g.offers.includes('overclock')||g.canUpgrade('overclock'));g.offers=['overclock'];g.choose('overclock');assert.equal(g.weapons.overclock,1);
});
test('overclock stays locked before sector twelve and increases actual attack damage afterward',()=>{
  const g=new Game(1);g.phase='upgrade';g.offers=['overclock'];assert.equal(g.choose('overclock'),false);
  const damage=[];
  for(const level of [0,2]){const h=new Game(3);h.enemies=[];h.weapons.overclock=level;const e=h.addEnemy(3,2,'boss');h.planEnemies();h.step(3,4);damage.push(e.maxHp-e.hp);}
  assert.equal(damage[1]-damage[0],2,'bonus applies once to each enemy per action');
});
test('old five-sector saves keep their progress and can continue through the new campaign',()=>{
  const g=new Game(42);g.sectorIndex=4;g.player.hp=5;g.score=12345;g.kills=300;g.weapons.blast=2;g.clearSector();
  const old=g.save();delete old.state.weapons.overclock;old.state.thresholds=old.state.thresholds.slice(0,26);
  const resumed=Game.restore(old);assert(resumed);assert.equal(resumed.player.hp,5);assert.equal(resumed.score,g.score);assert.equal(resumed.weapons.blast,2);assert.equal(resumed.weapons.overclock,0);assert.equal(resumed.thresholds.length,32);assert(resumed.nextSector());assert.equal(resumed.sector,6);
});
test('sector twenty restores late upgrades and has a valid final boss and attack forecast',()=>{
  const g=new Game(99);g.enemies=[];g.sectorIndex=19;g.weapons.overclock=3;g.player.maxHp=g.player.hp=12;g.spawnBoss();g.planEnemies();
  assert.equal(g.enemies[0].variant,'origin');assert.equal(g.enemies[0].hp,520);const restored=Game.restore(g.save());assert(restored);assert.equal(restored.sector,20);assert.equal(restored.weapons.overclock,3);assert.deepEqual(restored.preview(2,4),g.preview(2,4));assert.equal(STAGES.length,20);
});
test('sector transition displays 09/20 and 10/20 and resumes the late campaign',()=>{
  const h=boot();h.click('start');h.game.sectorIndex=8;h.game.enemies=[];const b=h.game.addEnemy(3,2,'boss');b.hp=1;b.intent={kind:'boss',cells:[]};h.tap(3,4);h.tick(850);
  assert.equal(h.$('clear-number').textContent,'09 / 20');h.click('next-sector');assert(h.$('sector').innerHTML.startsWith('10/20'));assert(h.$('next-name').textContent.startsWith('10 /'));
  const resumed=boot({initialStorage:[['turn-burst-run-v2',h.storage.get('turn-burst-run-v2')]]});resumed.click('continue');assert.equal(resumed.debug().sector,10);
});
