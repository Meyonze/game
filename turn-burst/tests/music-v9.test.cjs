const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),boot=require('./harness.cjs');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/music.js'),'utf8'),sandbox);
const {scores}=sandbox.window.TurnBurstMusic;
test('retro is a distinct, slower and less dense composition with valid looping phrases',()=>{
  const score=scores.retro;assert.equal(score.bars.length,16);assert.equal(score.steps,256);assert(score.bpm<110);
  const all=score.bars.flat(2);assert(!all.some(e=>['lead','guitar','bass','crash'].includes(e.instrument)));
  assert(all.some(e=>e.instrument==='chipLead'));assert(all.length/16<scores.normal.bars.flat(2).length/32);
  score.bars.forEach(bar=>bar.forEach((events,s)=>events.forEach(e=>assert(e.note>=24&&e.note<=84&&e.duration>0&&s+e.duration<=16))));
});
test('sound settings preview on a gesture, close without starting a run, and leave board size unchanged',()=>{
  const h=boot(),size=h.debug().canvas;assert.equal(h.audio.length,0);
  h.click('audio-settings');assert(!h.$('sound-screen').hidden);assert.equal(h.$('audio-settings').attrs['aria-expanded'],'true');assert.equal(h.audio.length,1);
  h.click('music-retro');h.tick(40);assert.equal(h.debug().music.style,'retro');assert.equal(h.debug().music.title,'PIXEL AFTERNOON');
  assert.equal(h.game.turn,0);assert(!h.debug().started);assert.deepEqual(h.debug().canvas,size);
  h.click('close-sound');h.tick(40);assert.equal(h.intervals.size,0);assert.equal(h.debug().music.voices,0);assert(h.$('sound-screen').hidden);
});
test('selection survives reload without autoplay and starts with the saved track',()=>{
  const first=boot();first.click('audio-settings');first.click('music-retro');
  assert.equal(first.storage.get('turn-burst-music-style'),'retro');
  const next=boot({initialStorage:[...first.storage]});assert.equal(next.audio.length,0);assert.equal(next.$('music-retro').attrs['aria-pressed'],'true');
  next.click('start');assert.equal(next.debug().music.style,'retro');assert.equal(next.debug().music.title,'PIXEL AFTERNOON');
});
test('choosing a track while muted preserves mute and creates no audio context',()=>{
  const h=boot({initialStorage:[['turn-burst-sound','off']]});h.click('audio-settings');h.click('music-retro');h.tick(1000);
  assert.equal(h.audio.length,0);assert.equal(h.$('sound').attrs['aria-pressed'],'false');assert.equal(h.storage.get('turn-burst-music-style'),'retro');
  h.click('sound');h.tick(40);assert.equal(h.debug().music.style,'retro');assert.equal(h.intervals.size,1);
});
test('repeated live switching uses one scheduler and releases every replaced voice',()=>{
  const h=boot();h.click('start');h.click('audio-settings');
  for(let i=0;i<20;i++){
    h.click(i%2?'music-battle':'music-retro');h.tick(80);
    assert.equal(h.intervals.size,1);assert(h.debug().music.voices<70);
  }
  const step=h.debug().music.step;h.click('music-battle');assert.equal(h.debug().music.step,step,'reselecting does not restart');
  assert(h.audio[0].oscillators.filter(o=>o.ended).every(o=>o.disconnected));
  h.click('sound');h.tick(40);assert.equal(h.debug().music.voices,0);assert.equal(h.intervals.size,0);
});
test('settings block gameplay and upgrade shortcuts until closed',()=>{
  const h=boot();h.click('start');h.click('audio-settings');h.key('ArrowUp');h.tap(3,4);assert.equal(h.game.turn,0);
  h.game.phase='upgrade';h.game.offers=['blast','arc','pulse'];h.key('1');assert.equal(h.game.weapons.blast,0);
  h.game.phase='play';h.key('Escape');assert(h.$('sound-screen').hidden);h.key('ArrowUp');assert.equal(h.game.turn,1);
});
test('retro uses a soft boss theme and switching back restores its battle arrangement',()=>{
  const h=boot({initialStorage:[['turn-burst-music-style','retro']]});h.click('start');h.game.sectorIndex=1;h.game.bossSpawned=true;
  h.click('audio-settings');for(let i=0;i<65;i++)h.tick(40);
  assert.equal(h.debug().music.title,'PIXEL / DANGER');h.click('music-battle');assert.equal(h.debug().music.title,'IRON WILL');
  h.click('music-retro');h.doc.hidden=true;h.docEvents.visibilitychange();h.tick(1000);
  assert.equal(h.intervals.size,0);h.doc.hidden=false;h.docEvents.visibilitychange();h.tick(40);
  assert.equal(h.debug().music.style,'retro');assert.equal(h.intervals.size,1);
});
test('the bass uses a nonlinear drive curve and disconnects distortion nodes on mute',()=>{
  const h=boot();h.click('start');for(let i=0;i<20;i++)h.tick(40);
  const shapes=h.audio[0].shapers;assert(shapes.length>=4);
  assert(shapes[0].curve[767]>.85);assert(shapes.every(s=>s.curve===shapes[0].curve));
  h.click('sound');h.tick(40);assert(shapes.every(s=>s.disconnected));
});
