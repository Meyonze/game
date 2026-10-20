const test=require('node:test'),assert=require('node:assert/strict');
const {Game,UPGRADES}=require('../dist/engine.js'),boot=require('./harness.cjs');
const coreIds=['coreburst','coreguard','coresalvage'];
function built(){
  const g=new Game(73);g.sectorIndex=11;g.enemies=[];g.player.hp=g.player.maxHp=12;
  for(const id of ['blast','cross','pulse','lance','armor','overclock'])g.weapons[id]=UPGRADES.find(u=>u.id===id).max;
  g.level=17;g.xpLevel=6;g.experience=g.thresholds[5];return g;
}
function grant(g,id){g.phase='play';g.bonusUpgrades++;g.checkUpgrade();assert(g.offers.includes(id));return g.choose(id);}
test('maxed armaments unlock three core paths without using another weapon slot',()=>{
  const g=built();assert(g.armamentComplete);assert(!g.buildComplete);g.bonusUpgrades=1;g.checkUpgrade();
  assert.deepEqual([...g.offers].sort(),[...coreIds].sort());const xp=g.xpLevel;assert(g.choose('coreburst'));
  assert.equal(g.weapons.coreburst,1);assert.equal(g.ownedWeapons.length,4);assert.equal(g.xpLevel,xp);assert.equal(g.bonusUpgrades,0);
});
test('core upgrades stay locked until the armaments are complete',()=>{
  const g=built();g.weapons.lance=2;assert(!g.armamentComplete);for(const id of coreIds)assert(!g.canUpgrade(id));
  g.weapons.lance=3;g.sectorIndex=10;assert(!g.canUpgrade('coreburst'));g.sectorIndex=11;assert(g.canUpgrade('coreburst'));
});
test('a core can grow for twenty choices and leaves the other paths available at its cap',()=>{
  const g=built();for(let i=1;i<=20;i++){assert(grant(g,'coreburst'));assert.equal(g.weapons.coreburst,i);}
  assert(!g.canUpgrade('coreburst'));assert(g.canUpgrade('coreguard'));assert(g.canUpgrade('coresalvage'));assert(!g.buildComplete);
  const r=Game.restore(g.save());assert(r);assert.equal(r.weapons.coreburst,20);assert.equal(r.level,37);
  for(const id of ['coreguard','coresalvage'])for(let i=0;i<20;i++)grant(r,id);
  assert(r.buildComplete);assert.equal(r.level,77);assert.equal(Game.restore(r.save()).level,77);
});
test('point shot boosts the fourth action only and the forecast matches the actual hit',()=>{
  const g=new Game(64);g.enemies=[];g.spawnWave=()=>{};g.spawnMedkit=()=>{};g.weapons.coreburst=3;
  const b=g.addEnemy(3,1,'boss');b.hp=b.maxHp=1000;b.intent={kind:'boss',cells:[]};const damage=[];
  for(let i=1;i<=4;i++){const p=g.preview(3,5),hp=b.hp;g.step(3,5);damage.push(hp-b.hp);assert.equal(p.bossDamage,hp-b.hp);assert.equal(g.events.find(e=>e.type==='beam').charged,i===4);}
  assert.deepEqual(damage,[2,2,2,5]);assert.equal(g.weaponPeriod('coreburst'),4);
});
test('reserve armor adds one max HP and one current HP, survives reload and respects its cap',()=>{
  const g=built();g.player.hp=4;grant(g,'coreguard');assert.equal(g.player.maxHp,13);assert.equal(g.player.hp,5);
  const r=Game.restore(g.save());assert(r);assert.equal(r.player.maxHp,13);assert.equal(r.weapons.coreguard,1);
  for(let i=1;i<20;i++)grant(r,'coreguard');assert.equal(r.player.maxHp,32);assert(!r.canUpgrade('coreguard'));
  const invalid=r.save();invalid.state.player.maxHp=33;assert.equal(Game.restore(invalid),null);
});
test('salvage retains fractional XP across saves and never grants summoned enemies XP',()=>{
  let g=new Game(16);g.enemies=[];g.weapons.coresalvage=1;
  for(let i=0;i<20;i++){
    const e=g.addEnemy(0,0);e.intent={kind:'shot',cells:[]};g.hit(e,1);g.enemies=[];
    if(i===9){assert.equal(g.experience,10);assert.equal(g.xpRemainder,50);g=Game.restore(g.save());assert(g);}
  }
  assert.equal(g.experience,21);assert.equal(g.xpRemainder,0);
  const child=g.addEnemy(1,1);child.summoned=true;g.hit(child,1);assert.equal(g.experience,21);
});
test('older maxed saves retain their loadout and can resume into a core choice',()=>{
  const g=built();g.experience=g.thresholds[g.xpLevel];const record=g.save();record.version=3;
  for(const id of coreIds)delete record.state.weapons[id];delete record.state.xpRemainder;
  const r=Game.restore(record);assert(r);assert.equal(r.phase,'upgrade');assert.deepEqual([...r.offers].sort(),[...coreIds].sort());assert.equal(r.ownedWeapons.length,4);
  assert.equal(r.player.maxHp,12);assert.equal(r.save().version,4);
});
test('an old final-boss cleanup save opens the victory result and clears its old continuation record',()=>{
  const g=new Game(81);g.sectorIndex=19;g.enemies=[];const e=g.addEnemy(0,0,'warder');e.intent={kind:'shot',cells:[]};
  g.bossSpawned=true;g.bossDead=true;g.bossesDefeated=12;g.clearedSectors=19;
  const record=g.save();record.version=3;const h=boot({initialStorage:[['turn-burst-run-v2',JSON.stringify(record)]]});
  assert(!h.$('continue').hidden);h.click('continue');assert.equal(h.debug().phase,'won');assert(!h.$('result-screen').hidden);assert.equal(h.debug().enemies.length,0);assert.equal(h.debug().bossesDefeated,12);assert.equal(h.storage.get('turn-burst-run-v2'),'null');assert.equal(h.intervals.size,0);
});
test('core selection keeps the touch protection, rank display and unchanged board size',()=>{
  const g=built();g.bonusUpgrades=1;g.checkUpgrade();const h=boot({initialStorage:[['turn-burst-run-v2',JSON.stringify(g.save())]]});
  h.click('continue');const dims=JSON.stringify(h.debug().canvas);assert(h.$('upgrade-rule').textContent.includes('コア'));assert(h.$('choices').innerHTML.includes('改造 RANK 1'));
  h.choiceDown('coreburst');h.choiceUp('coreburst');h.choiceClick('coreburst');assert.equal(h.debug().weapons.coreburst,0);
  h.choose('coreburst');assert.equal(h.debug().weapons.coreburst,1);assert.equal(h.debug().phase,'play');assert(h.$('loadout').innerHTML.includes('R1'));assert.equal(JSON.stringify(h.debug().canvas),dims);
});
