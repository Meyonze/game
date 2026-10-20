const test=require('node:test'),assert=require('node:assert/strict'),boot=require('./harness.cjs');
function finale(options={}){
  const h=boot(options);h.click('start');const g=h.game;g.sectorIndex=19;g.enemies=[];
  const boss=g.addEnemy(3,2,'boss');boss.variant='origin';boss.hp=1;boss.intent={kind:'boss',cells:[]};
  const mob=g.addEnemy(0,0,'brute');mob.intent={kind:'move',cells:[]};
  h.tap(3,4);return h;
}
test('final boss win is recorded immediately and waits eight seconds for the result',()=>{
  const h=finale();assert.equal(h.game.phase,'won');assert.equal(h.game.enemies.length,0);assert(h.$('result-screen').hidden);
  assert(h.storage.has('turn-burst-best-v5'));assert.equal(h.storage.get('turn-burst-run-v2'),'null');
  assert.equal(h.debug().finale.duration,8000);h.tick(8000);assert(h.$('result-screen').hidden);h.tick(140);
  assert(!h.$('result-screen').hidden);assert.equal(h.debug().finale,null);assert(!h.debug().busy);assert(h.$('finale-overlay').hidden);
});
test('finale progresses through collapse, shutdown and the quiet ending',()=>{
  const h=finale();h.tick(160);assert.equal(h.$('finale-kicker').textContent,'FINAL BLOW');
  h.tick(1300);assert.equal(h.$('finale-kicker').textContent,'CORE COLLAPSE');
  h.tick(3600);assert.equal(h.$('finale-kicker').textContent,'SYSTEM SHUTDOWN');
  h.tick(1400);assert.equal(h.$('finale-kicker').textContent,'ORIGIN SILENCED');assert(h.$('result-screen').hidden);
});
test('rapid taps, keys, help and retry cannot interrupt the finale or alter rewards',()=>{
  const h=finale(),snapshot=JSON.stringify(h.game.save()),score=h.game.score;
  for(let i=0;i<20;i++){h.tap(3,4);h.key(' ');h.click('help');h.click('retry');h.tick(100);}
  assert.equal(JSON.stringify(h.game.save()),snapshot);assert(h.$('help-screen').hidden);assert(h.$('result-screen').hidden);
  h.tick(6200);assert.equal(h.game.score,score);assert(!h.$('result-screen').hidden);
  const n=h.audio[0].oscillators.length;h.tick(20000);assert.equal(h.audio[0].oscillators.length,n);
  h.click('retry');assert.equal(h.game.phase,'play');assert.equal(h.game.turn,0);
});
test('backgrounding pauses the cinematic clock and does not skip the ending',()=>{
  const h=finale();h.tick(1800);const elapsed=h.debug().finale.elapsed;
  h.doc.hidden=true;h.docEvents.visibilitychange();h.tick(60000);assert.equal(h.debug().finale.elapsed,elapsed);
  assert.equal(h.audio[0].state,'suspended');assert(h.$('result-screen').hidden);
  h.doc.hidden=false;h.docEvents.visibilitychange();assert.equal(h.debug().finale.elapsed,elapsed);assert.equal(h.audio[0].state,'running');
  h.tick(6100);assert(h.$('result-screen').hidden);h.tick(250);assert(!h.$('result-screen').hidden);
});
test('cinematic audio can be muted with the visible header without restarting BGM',()=>{
  const h=finale();h.tick(200);assert.equal(h.intervals.size,0);h.click('audio-settings');
  assert.equal(h.audio[0].state,'suspended');assert(h.$('sound-screen').hidden);
  const count=h.audio[0].oscillators.length;h.tick(1600);assert.equal(h.audio[0].oscillators.length,count);
  h.click('audio-settings');assert.equal(h.audio[0].state,'running');assert.equal(h.intervals.size,0);
  for(let i=0;i<70;i++)h.tick(100);assert(!h.$('result-screen').hidden);
  assert(h.audio[0].oscillators.every(o=>o.ended&&o.disconnected));
});
test('reduced motion keeps the full ending and rendering remains finite after resizing',()=>{
  const h=finale({reduced:true,width:292,height:300}),score=h.game.score;
  for(let i=0;i<82;i++){if(i===30)h.resize(472,630);h.tick(100);}
  assert(!h.$('result-screen').hidden);assert.equal(h.game.score,score);assert(h.calls>10000);
});
test('ordinary boss victories retain the normal transition without a cinematic',()=>{
  const h=boot();h.click('start');const g=h.game;g.sectorIndex=1;g.enemies=[];const b=g.addEnemy(3,2,'boss');b.hp=1;b.intent={kind:'boss',cells:[]};
  h.tap(3,4);h.tick(850);assert.equal(h.debug().finale,null);assert.equal(g.phase,'rest');assert(!h.$('rest-screen').hidden);
});
test('surviving final boss does not trigger the ending',()=>{
  const h=boot();h.click('start');h.game.sectorIndex=19;h.game.enemies=[];const b=h.game.addEnemy(3,2,'boss');b.variant='origin';b.intent={kind:'boss',cells:[]};
  h.tap(3,4);h.tick(850);assert.equal(h.debug().finale,null);assert.equal(h.game.phase,'play');assert(h.$('finale-overlay').hidden);
});
