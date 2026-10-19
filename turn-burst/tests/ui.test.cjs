const test=require('node:test'),assert=require('node:assert/strict'),boot=require('./harness.cjs');
test('title screen waits for start and elapsed real time never advances a turn',()=>{
  const h=boot();h.tick(60000);assert.equal(h.game.turn,0);assert.equal(h.audio.length,0);h.tap(3,4);assert.equal(h.game.turn,0);
  h.click('start');h.tick(60000);assert.equal(h.game.turn,0);assert(h.$('start-screen').hidden);
});
test('holding previews without moving; release executes exactly that action',()=>{
  const h=boot();h.click('start');const p=h.game.preview(3,4);h.down(3,4);h.tick(2000);
  assert.equal(h.game.turn,0);assert(h.$('hint').textContent.includes(`${p.kills}撃破`));
  h.up(3,4);assert.equal(h.game.turn,1);assert.equal(h.game.lastKills,p.kills);h.tick(850);assert(!h.debug().busy);
});
test('dragging outside valid movement cells and pointer cancellation cost no turn',()=>{
  const h=boot();h.click('start');h.down(3,4);h.move(0,0);h.up(0,0);assert.equal(h.game.turn,0);
  h.down(3,4);h.cancel();h.up(3,4);assert.equal(h.game.turn,0);
});
test('rapid taps and a second finger cannot submit extra actions during combat',()=>{
  const h=boot();h.click('start');h.down(3,4);h.down(4,5,{pointerId:2});h.up(4,5,{pointerId:2});assert.equal(h.game.turn,0);h.up(3,4);h.tap(3,3);h.key('ArrowUp');assert.equal(h.game.turn,1);h.tick(850);assert.equal(h.game.turn,1);
});
test('touch hit testing remains correct when the arena is resized',()=>{
  for(const [w,hgt] of [[292,300],[362,480],[472,630]]){const h=boot({width:w,height:hgt});h.click('start');h.resize(w-15,hgt-25);h.tap(2,4);assert.equal(h.game.player.x,2);assert.equal(h.game.player.y,4);const d=h.debug();assert(d.canvas.width<=w-15+.01);assert(d.canvas.height<=hgt-25+.01);h.tick(850);}
});
test('help leaves combat paused and ignores keyboard movement',()=>{
  const h=boot();h.click('start');h.click('help');h.key('ArrowUp');h.tap(3,4);h.tick(10000);assert.equal(h.game.turn,0);assert(!h.$('help-screen').hidden);h.key('Escape');h.key('ArrowUp');assert.equal(h.game.turn,1);
});
test('upgrade screen blocks movement and selecting an offered weapon resumes play',()=>{
  const h=boot();h.click('start');h.game.kills=5;h.game.experience=5;h.tap(3,4);assert.equal(h.game.phase,'upgrade');h.key('1');assert.equal(h.game.level,0,'animation must finish first');h.tick(850);assert(!h.$('upgrade-screen').hidden);h.tap(3,3);assert.equal(h.game.turn,1);h.choose('blast');assert.equal(h.game.weapons.blast,1);assert.equal(h.game.phase,'play');assert(h.$('upgrade-screen').hidden);
});
test('result state is reachable and retry resets the campaign, weapons and score',()=>{
  const h=boot();h.click('start');h.game.sectorIndex=19;h.game.enemies=[];const b=h.game.addEnemy(3,2,'boss');b.hp=1;b.intent={kind:'boss',cells:[]};h.tap(3,4);h.tick(850);assert.equal(h.game.phase,'won');assert(!h.$('result-screen').hidden);assert(h.storage.has('turn-burst-best-v5'));h.click('retry');assert.equal(h.game.turn,0);assert.equal(h.game.phase,'play');assert.equal(h.game.score,0);assert.equal(h.game.weapons.blast,0);assert(h.$('result-screen').hidden);
});
test('audio starts on a gesture, mutes, resumes and stops its scheduler in background',()=>{
  const h=boot();assert.equal(h.audio.length,0);h.click('start');h.tick(200);assert.equal(h.audio.length,1);assert(h.audio[0].oscillators.length>0);h.click('sound');const n=h.audio[0].oscillators.length;h.tick(1000);assert.equal(h.audio[0].oscillators.length,n);assert.equal(h.intervals.size,0);h.click('sound');h.tick(100);h.tick(100);h.tick(100);h.tick(100);assert(h.audio[0].oscillators.length>n);h.doc.hidden=true;h.docEvents.visibilitychange();assert.equal(h.intervals.size,0);assert.equal(h.audio[0].state,'suspended');h.doc.hidden=false;h.docEvents.visibilitychange();h.tick(200);assert.equal(h.intervals.size,1);h.windowEvents.pagehide();assert.equal(h.intervals.size,0);
});
test('reduced-motion mode still resolves incoming attacks and damage feedback',()=>{
  const h=boot({reduced:true});h.click('start');h.game.enemies=[];const e=h.game.addEnemy(0,0,'gunner');e.intent={kind:'shot',cells:[{x:3,y:5}]};h.tap(3,5);h.tick(200);h.tick(300);h.tick(250);assert.equal(h.game.player.hp,7);assert(!h.debug().busy);assert.equal(h.$('hp-number').textContent,'7 / 8');
});
test('storage blocked by browser privacy settings does not prevent play or retry',()=>{
  const h=boot({noStorage:true});h.click('start');h.tap(3,4);h.tick(850);assert.equal(h.game.turn,1);h.click('sound');h.click('retry');assert.equal(h.game.turn,0);
});
test('rendering a complete campaign uses finite canvas coordinates and balanced save/restore',()=>{
  const h=boot();h.click('start');
  while(h.game.phase==='play'&&h.game.turn<650){
    const g=h.game,options=[];for(let y=g.player.y-1;y<=g.player.y+1;y++)for(let x=g.player.x-1;x<=g.player.x+1;x++)if(g.canMove(x,y)){const p=g.preview(x,y);options.push({x,y,s:p.kills*3+p.bossDamage*2-p.damage*14+p.heal*9-(g.enemies.find(e=>e.type==='boss')?Math.max(Math.abs(x-g.enemies.find(e=>e.type==='boss').x),Math.abs(y-g.enemies.find(e=>e.type==='boss').y))*.5:0)});}
    options.sort((a,b)=>b.s-a.s);h.tap(options[0].x,options[0].y);for(let i=0;i<9;i++)h.tick(100);
    if(g.phase==='rest')h.click('next-sector');
    while(g.phase==='upgrade'){const order=g.player.hp<4?['armor','overclock','blast','pulse','lance','cross','arc','meteor','drone','flame','frost']:['overclock','blast','pulse','lance','cross','arc','meteor','drone','flame','frost','armor'];h.choose(order.find(id=>g.offers.includes(id)));}
  }
  assert.equal(h.game.phase,'won');assert(h.calls>100000);assert(!h.$('result-screen').hidden);
});
