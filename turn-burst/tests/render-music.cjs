// Optional offline score preview; requires Python numpy/scipy, not used by the game.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.join(__dirname,'..'),sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'dist/music.js'),'utf8'),sandbox);
const {scores,BattleMusic}=sandbox.window.TurnBurstMusic;
const tracks=[];
for(const [mode,score] of Object.entries(scores)){
  const voices=[],unit=60/score.bpm/4;
  const synth={bus:{gain:{setValueAtTime(){}}},voice:voice=>voices.push(voice)};
  score.bars.forEach((bar,b)=>bar.forEach((events,s)=>events.forEach(e=>BattleMusic.prototype.play.call(synth,e,(b*16+s)*unit,unit))));
  tracks.push({mode,seconds:score.steps*unit,delay:45/score.bpm,voices});
}
const spec=path.join(root,'artifacts/music-voices.json');
fs.writeFileSync(spec,JSON.stringify(tracks));
cp.execFileSync('python',[path.join(__dirname,'render-music.py'),path.join(root,'artifacts'),spec],{stdio:'inherit',env:{...process.env,OPENBLAS_NUM_THREADS:'1'}});
