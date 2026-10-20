const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {Game}=require('../dist/engine.js'),boot=require('./harness.cjs');
function empty(){const g=new Game(97);g.enemies=[];return g;}
function aim(g,x,y,type='gunner',hp=99){const e=g.addEnemy(x,y,type);e.hp=e.maxHp=hp;e.intent={kind:'shot',cells:[{x:3,y:5}]};return e;}
test('preview names the attacker eliminated by this action and the one that still hits',()=>{
  const g=empty(),dead=aim(g,3,4,'gunner',1),live=aim(g,0,5);
  const p=g.preview(3,5);assert.equal(p.threats.find(e=>e.id===dead.id).state,'killed');assert.equal(p.threats.find(e=>e.id===live.id).state,'hit');
  assert.equal(p.damage,1);g.step(3,5);assert.equal(g.events.find(e=>e.type==='hurt').amount,p.damage);assert(!g.enemies.some(e=>e.id===dead.id));
});
test('contact movement counts as an attack and changing the destination avoids it',()=>{
  const g=empty(),e=aim(g,2,5,'runner');e.intent.kind='move';e.intent.x=3;e.intent.y=5;
  assert.equal(g.preview(3,5).threats[0].id,e.id);assert.equal(g.preview(3,5).damage,1);
  assert.equal(g.preview(4,5).threats.length,0);assert.equal(g.preview(4,5).damage,0);
});
test('freezing an attacker blocks it while warders remain active',()=>{
  const g=empty();g.weapons.frost=1;const cold=aim(g,3,4),immune=aim(g,4,5,'warder');
  const p=g.preview(3,5);assert.equal(p.threats.find(e=>e.id===cold.id).state,'frozen');assert.equal(p.threats.find(e=>e.id===immune.id).state,'hit');assert.equal(p.damage,2);
  cold.frozen=1;const frozen=g.preview(3,5);assert(!frozen.threats.some(e=>e.id===cold.id));assert(frozen.stopped.includes(cold.id));
});
test('boss kill cancels the remaining sources for this action, and armor is distinct from a kill',()=>{
  const g=empty();g.sectorIndex=1;g.bossSpawned=true;const boss=aim(g,3,2,'boss',1),other=aim(g,0,5);
  const p=g.preview(3,5);assert.equal(p.threats.find(e=>e.id===boss.id).state,'killed');assert.equal(p.threats.find(e=>e.id===other.id).state,'bossStopped');assert.equal(p.damage,0);
  const a=empty();a.weapons.armor=1;a.turn=2;aim(a,0,5);const protectedMove=a.preview(3,5);
  assert.equal(protectedMove.threats[0].state,'hit');assert.equal(protectedMove.damage,0);assert.equal(protectedMove.armorBlocked,1);
});
test('cause totals predict damage across generated positions without changing game state',()=>{
  for(let seed=1;seed<=16;seed++){
    const g=new Game(seed);g.weapons.frost=seed%3;g.weapons.blast=seed%2;g.weapons.armor=seed%3;g.turn=seed%6;
    const before=JSON.stringify(g);
    for(let y=4;y<=6;y++)for(let x=2;x<=4;x++)if(g.canMove(x,y)){
      const p=g.preview(x,y),armor=g.weapons.armor&&(g.turn+1)%(g.weapons.armor>1?2:3)===0?1:0;
      assert.equal(p.damage,Math.max(0,Math.min(2,p.rawDamage)-armor));
      const after=g.clone();after.step(x,y);assert.equal(p.damage,after.events.filter(e=>e.type==='hurt').reduce((s,e)=>s+e.amount,0));
    }
    assert.equal(JSON.stringify(g),before);
  }
});
test('holding shows matching source labels, prevention and remaining damage; cancel clears them',()=>{
  const h=boot();h.click('start');h.game.enemies=[];aim(h.game,3,4,'gunner',1);aim(h.game,0,5);
  h.down(3,5);h.tick(20);assert(h.$('threat-detail').textContent.includes('A：撃破で阻止'));assert(h.$('threat-detail').textContent.includes('B：攻撃が残る'));assert(h.$('hint').textContent.includes('HP −1'));
  assert.deepEqual(h.debug().threats.map(e=>e.state),['killed','hit']);assert.equal(h.game.turn,0);
  h.cancel();assert(h.$('threat-detail').textContent.includes('長押し'));assert(h.debug().threats.every(e=>e.state==='aim'));
});
test('origin has a final introduction, golden health display and core reveal without increasing HP',()=>{
  const h=boot();h.click('start');h.game.sectorIndex=19;h.game.sectorTurn=h.game.stage.turns-1;h.game.enemies=[];
  h.tap(3,5);h.tick(850);const boss=h.game.enemies.find(e=>e.type==='boss');assert.equal(boss.variant,'origin');assert.equal(boss.maxHp,430);
  assert(h.$('boss-intro').classList.contains('show'));assert(h.$('boss-health').classList.contains('final-health'));assert(h.$('boss-name').textContent.includes('FINAL BOSS'));assert.equal(h.debug().music.mode,'final');
  boss.hp=210;h.down(3,5);assert(!h.$('boss-intro').classList.contains('show'));h.up(3,5);h.tick(850);
  assert(h.$('boss-health').classList.contains('awakened'));assert(h.$('boss-name').textContent.includes('核心露出'));assert.equal(h.debug().music.mode,'finale');
});
test('boss entry replaces the normal track immediately and the final boss has its own score',()=>{
  const h=boot();h.click('start');h.game.sectorIndex=1;h.game.sectorTurn=h.game.stage.turns-1;h.game.enemies=[];
  h.tap(3,5);h.tick(670);assert.equal(h.debug().music.mode,'boss');assert.equal(h.debug().music.title,'IRON WILL');assert.equal(h.intervals.size,1);
  const s={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/music.js'),'utf8'),s);const {scores}=s.window.TurnBurstMusic;
  assert.notDeepEqual(scores.final.bars,scores.boss.bars);assert(scores.final.bars.flat(2).some(e=>e.instrument==='choir'));assert(scores.finale.bpm>scores.final.bpm);
});
test('final themes and restored retro stay bounded, with no extra turn or audio scheduler',()=>{
  for(const style of ['battle','retro']){
    const h=boot({initialStorage:[['turn-burst-music-style',style]]});h.click('start');h.game.sectorIndex=19;h.game.sectorTurn=h.game.stage.turns-1;h.game.enemies=[];h.tap(3,5);h.tick(850);
    let peak=0;for(let i=0;i<1150;i++){h.tick(40);peak=Math.max(peak,h.debug().music.voices);}
    assert(peak<75);assert.equal(h.intervals.size,1);assert.equal(h.game.turn,1);assert.equal(h.debug().music.style,style);
    const boss=h.game.enemies.find(e=>e.type==='boss');boss.hp=1;h.game.enemies=[boss];aim(h.game,0,0,'warder');
    h.tap(3,4);h.tick(850);assert(h.game.bossDead);assert.equal(h.game.phase,'won');assert.equal(h.intervals.size,0);assert.equal(h.game.enemies.length,0);
    h.tick(40);assert.equal(h.debug().music.voices,0);
  }
});
