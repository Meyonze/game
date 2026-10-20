const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../dist/engine.js'),boot=require('./harness.cjs');
function choose(g,id,sector,turn,bonus=false){g.sectorIndex=sector-1;g.turn=turn;g.phase='upgrade';g.offers=[id];g.pendingBonus=bonus;g.bonusUpgrades=bonus?1:0;assert(g.choose(id));}
function win(h){const g=h.game;g.sectorIndex=19;g.enemies=[];const b=g.addEnemy(3,2,'boss');b.variant='origin';b.hp=1;b.intent={kind:'boss',cells:[]};h.tap(3,4);h.tick(8300);assert(!h.$('result-screen').hidden);}
test('successful choices record their order, actual rank, sector, turn and supply source',()=>{
  const g=new Game(7);choose(g,'blast',2,6);choose(g,'pulse',3,12,true);choose(g,'blast',6,30);choose(g,'blast',9,47);
  assert.deepEqual(g.upgradeHistory,[{id:'blast',level:1,sector:2,turn:6,source:'xp'},{id:'pulse',level:1,sector:3,turn:12,source:'bonus'},{id:'blast',level:2,sector:6,turn:30,source:'xp'},{id:'blast',level:3,sector:9,turn:47,source:'xp'}]);
});
test('failed choices and combat previews cannot add or change a history entry',()=>{
  const g=new Game(4);choose(g,'blast',2,5);const before=JSON.stringify(g.upgradeHistory);assert(!g.choose('pulse'));g.preview(3,4);assert.equal(JSON.stringify(g.upgradeHistory),before);
  const clone=g.clone();clone.upgradeHistory[0].level=2;assert.equal(g.upgradeHistory[0].level,1);
});
test('history survives saves and a resumed choice appends once',()=>{
  const g=new Game(8);choose(g,'blast',2,8);choose(g,'pulse',4,18,true);const save=g.save(),r=Game.restore(save);assert(r);assert.deepEqual(r.upgradeHistory,g.upgradeHistory);
  choose(r,'blast',6,31);assert.equal(r.upgradeHistory.length,3);assert.equal(g.upgradeHistory.length,2);assert.equal(Game.restore(r.save()).upgradeHistory[2].level,2);
});
test('old saves have no invented history and record subsequent choices',()=>{
  const g=new Game(8);g.weapons.blast=2;g.level=2;const save=g.save();delete save.state.upgradeHistory;
  for(const version of [2,3,4]){save.version=version;const r=Game.restore(save);assert(r);assert.deepEqual(r.upgradeHistory,[]);choose(r,'blast',6,30);assert.equal(r.upgradeHistory[0].level,3);assert(Game.restore(r.save()));}
});
test('malformed histories cannot break a resumed run or inject result content',()=>{
  const g=new Game(7);choose(g,'blast',2,8);choose(g,'blast',6,30);
  for(const mutate of [s=>s.upgradeHistory={},s=>s.upgradeHistory[0]=null,s=>s.upgradeHistory[0].id='<img>',s=>s.upgradeHistory[0].level=0,s=>s.upgradeHistory[1].level=1,s=>s.upgradeHistory[1].turn=7,s=>s.upgradeHistory[1].sector=1,s=>s.upgradeHistory[0].source='html']){const save=g.save();mutate(save.state);assert.equal(Game.restore(save),null);}
});
test('victory result shows sector groups, upgrade transitions and awakening',()=>{
  const h=boot();h.click('start');choose(h.game,'blast',2,6);choose(h.game,'pulse',3,12,true);choose(h.game,'blast',6,30);choose(h.game,'blast',9,47);win(h);
  const html=h.$('history-entries').innerHTML;assert.equal(h.$('history-count').textContent,'4回');assert(html.includes('02面'));assert(html.includes('06面'));assert(html.includes('09面'));
  assert(html.includes('新規取得 · LV.1'));assert(html.includes('LV.1 → LV.2'));assert(html.includes('LV.2 → 覚醒 LV.3'));assert(html.includes('補給'));assert(html.indexOf('02面')<html.indexOf('03面'));assert(h.$('result-history').open);
});
test('untracked inherited equipment is distinguished from recorded selections',()=>{
  const h=boot();h.click('start');h.game.weapons.blast=1;h.game.level=1;choose(h.game,'blast',6,30);win(h);
  const html=h.$('history-entries').innerHTML;assert(html.includes('再開時の装備'));assert(html.includes('取得順・面数は記録されていません'));assert(html.includes('LV.1 → LV.2'));assert.equal(h.$('history-count').textContent,'1回');
});
test('empty runs show an honest empty state and retry clears the previous history',()=>{
  const h=boot();h.click('start');win(h);assert(h.$('history-entries').innerHTML.includes('強化を選ぶ前'));assert.equal(h.$('history-count').textContent,'0回');
  h.click('retry');choose(h.game,'blast',1,1);assert.equal(h.debug().upgradeHistory.length,1);win(h);h.click('retry');assert.equal(h.debug().upgradeHistory.length,0);assert.equal(h.game.level,0);
});
