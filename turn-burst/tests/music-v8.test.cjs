const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const boot=require('./harness.cjs');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/music.js'),'utf8'),sandbox);
const {scores}=sandbox.window.TurnBurstMusic;
test('battle compositions have complete looping bars with valid playable notes',()=>{
  for(const score of [scores.normal,scores.boss,scores.final,scores.finale]){
    assert.equal(score.steps,score.bars.length*16);
    const seconds=score.steps*60/score.bpm/4;assert(seconds>=20&&seconds<=60);
    const melodies=new Set();
    score.bars.forEach((bar,b)=>{
      assert.equal(bar.length,16);
      const line=[];
      bar.forEach((events,s)=>events.forEach(e=>{
        assert(Number.isFinite(e.note)&&e.note>=24&&e.note<=98);
        assert(e.duration>0&&e.gain>0&&s+e.duration<=16);
        if(['lead','bossLead'].includes(e.instrument))line.push([s,e.note,e.duration]);
      }));
      assert(line.length>=4,'a written melody in each bar');melodies.add(JSON.stringify(line));
    });
    assert(melodies.size>=(score===scores.normal?24:16),'the composition develops beyond a short repeating riff');
  }
});
test('boss battle has a separate melody, faster tempo and denser accompaniment',()=>{
  const normal=scores.normal.bars.flat(2),boss=scores.boss.bars.flat(2);
  assert.notDeepEqual(boss.filter(e=>e.instrument==='bossLead').map(e=>e.note),normal.filter(e=>e.instrument==='lead').map(e=>e.note));
  assert(boss.some(e=>e.instrument==='bossGuitar'));assert(!normal.some(e=>e.instrument==='bossGuitar'));
  assert(boss.filter(e=>e.instrument==='kick').length/scores.boss.bars.length>normal.filter(e=>e.instrument==='kick').length/scores.normal.bars.length);
  assert(scores.boss.bpm>=scores.normal.bpm*1.25);
});
test('two full loops keep voices bounded, clean up nodes, and never advance gameplay',()=>{
  const h=boot();h.click('start');let peak=0;
  for(let i=0;i<2750;i++){h.tick(40);peak=Math.max(peak,h.debug().music.voices);}
  assert.equal(h.game.turn,0);assert(peak>10&&peak<70,`peak music voices: ${peak}`);
  assert(h.audio[0].oscillators.filter(o=>o.ended).every(o=>o.disconnected));
  assert.equal(h.intervals.size,1);
  h.click('sound');h.tick(40);assert.equal(h.debug().music.voices,0);assert.equal(h.intervals.size,0);
});
test('boss arrival and defeat request transitions without restarting the song',()=>{
  const h=boot();h.click('start');h.game.sectorIndex=1;h.game.sectorTurn=h.game.stage.turns-1;h.game.enemies=[];
  h.tap(3,5);h.tick(850);assert(h.game.bossSpawned);assert.equal(h.debug().music.pending,'boss');
  for(let i=0;i<50;i++)h.tick(40);
  assert.equal(h.debug().music.mode,'boss');assert.equal(h.intervals.size,1);
  const boss=h.game.enemies.find(e=>e.type==='boss');boss.hp=1;boss.x=3;boss.y=2;
  h.game.enemies=[boss];
  h.tap(3,4);h.tick(850);assert(h.game.bossDead);assert.equal(h.debug().music.pending,'normal');
  for(let i=0;i<50;i++)h.tick(40);
  assert.equal(h.debug().music.mode,'normal');assert.equal(h.intervals.size,1);
});
test('background resume avoids backlog and retry starts at the beginning',()=>{
  const h=boot();h.click('start');for(let i=0;i<20;i++)h.tick(40);
  h.doc.hidden=true;h.docEvents.visibilitychange();h.tick(60000);assert.equal(h.intervals.size,0);
  const count=h.audio[0].oscillators.length;
  h.doc.hidden=false;h.docEvents.visibilitychange();h.tick(40);
  assert(h.audio[0].oscillators.length-count<35,'no accumulated minute of notes');
  h.click('retry');assert(h.debug().music.step<=2);assert.equal(h.intervals.size,1);
});
test('saved mute preference creates no audio and results stop every music voice',()=>{
  const muted=boot({initialStorage:[['turn-burst-sound','off']]});muted.click('start');muted.tick(1000);assert.equal(muted.audio.length,0);
  muted.click('sound');muted.tick(40);assert.equal(muted.audio.length,1);
  const h=boot();h.click('start');h.game.player.hp=1;h.game.enemies=[];
  const enemy=h.game.addEnemy(0,0,'brute');enemy.intent={kind:'shot',cells:[{x:3,y:5}]};
  h.tap(3,5);h.tick(850);assert.equal(h.game.phase,'lost');h.tick(40);
  assert.equal(h.intervals.size,0);assert.equal(h.debug().music.voices,0);
});
