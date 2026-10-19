/* Original score: IGNITION / IRON WILL. 32 bars, D minor, no sampled assets. */
(() => {
  'use strict';
  const midi = name => {
    const m=/^([A-G])(s|b)?(\d)$/.exec(name);
    if(!m)throw Error('Invalid note: '+name);
    return 12*(Number(m[3])+1)+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='s'?1:m[2]==='b'?-1:0);
  };
  // Sixteenth-note durations. Phrases are written, rather than randomized.
  const melody=[
    'D5:2 A5:3 G5:1 F5:2 E5:1 F5:1 A5:2 G5:2 F5:2',
    'F5:3 E5:1 D5:2 F5:2 Bb5:4 A5:2 F5:2',
    'G5:2 D6:2 C6:1 Bb5:1 A5:2 Bb5:2 A5:2 G5:2 F5:2',
    'E5:2 Cs5:2 E5:2 A5:2 G5:2 E5:1 F5:1 E5:2 Cs5:2',
    'D5:2 F5:2 A5:4 D6:3 C6:1 Bb5:2 A5:2',
    'G5:2 E5:2 G5:2 C6:2 Bb5:1 C6:1 D6:2 C6:2 G5:2',
    'Bb5:3 A5:1 G5:2 F5:2 D5:2 F5:2 A5:2 G5:2',
    'E5:4 Cs5:2 E5:2 A5:3 G5:1 E5:2 Cs5:2',
    'D5:2 A5:2 D6:3 C6:1 A5:2 F5:2 G5:2 A5:2',
    'Bb5:3 A5:1 F5:2 D5:2 F5:2 A5:2 Bb5:2 D6:2',
    'C6:2 Bb5:2 A5:2 G5:2 D6:3 C6:1 Bb5:2 G5:2',
    'A5:2 G5:2 E5:2 Cs5:2 E5:2 F5:1 G5:1 A5:2 Cs6:2',
    'D6:6 A5:2 F5:2 E5:2 D5:2 F5:2',
    'G5:3 A5:1 Bb5:2 A5:2 G5:2 F5:2 E5:2 D5:2',
    'Cs5:2 E5:2 G5:2 A5:2 Bb5:2 A5:2 G5:2 Cs6:2',
    'D6:6 A5:2 D6:4 _:2 C6:1 D6:1',
    'A5:6 G5:2 F5:2 A5:2 C6:4',
    'D6:4 C6:2 Bb5:2 A5:2 G5:2 F5:4',
    'Bb5:6 A5:2 G5:2 F5:2 D5:2 F5:2',
    'G5:2 C6:4 Bb5:2 G5:2 E5:2 G5:2 C6:2',
    'A5:4 C6:2 D6:2 E6:4 D6:2 C6:2',
    'D6:4 Bb5:2 A5:2 G5:4 F5:2 G5:2',
    'A5:2 Bb5:2 D6:4 C6:2 Bb5:2 A5:2 G5:2',
    'E5:2 G5:2 A5:4 Cs6:2 D6:2 E6:2 Cs6:2',
    'D6:4 A5:2 F5:2 D5:2 E5:2 F5:2 A5:2',
    'Bb5:4 D6:2 C6:2 Bb5:2 A5:2 G5:2 F5:2',
    'G5:2 Bb5:2 D6:2 F6:2 E6:2 D6:2 Bb5:2 G5:2',
    'A5:4 Cs6:2 E6:2 D6:2 Cs6:2 Bb5:2 A5:2',
    'D6:4 C6:2 A5:2 F5:4 E5:2 D5:2',
    'Bb5:2 A5:2 G5:2 F5:2 E5:2 F5:2 G5:2 Bb5:2',
    'A5:2 Cs6:2 E6:4 D6:2 Cs6:2 Bb5:2 A5:2',
    'G5:2 E5:2 Cs5:2 E5:2 A5:2 G5:2 E5:1 F5:1 E5:1 Cs5:1'
  ];
  const chords={
    d:{bass:38,notes:[62,65,69]},b:{bass:34,notes:[62,65,70]},
    g:{bass:31,notes:[62,67,70]},a:{bass:33,notes:[61,64,69]},
    c:{bass:36,notes:[60,64,67]},f:{bass:29,notes:[60,65,69]}
  };
  const harmony='d b g a d c b a d b g a d g a d f g b c f g b a d b g a d b a a'.split(' ');
  function compose(mode){
    const bars=Array.from({length:32},()=>Array.from({length:16},()=>[]));
    const put=(bar,step,instrument,note,duration,gain=1)=>bars[bar][step].push({instrument,note,duration,gain});
    const boss=mode==='boss';
    melody.forEach((phrase,bar)=>{
      const chord=chords[harmony[bar]],section=Math.floor(bar/8);
      let pos=0;
      for(const token of phrase.split(' ')){
        const [name,d]=token.split(':'),duration=Number(d);
        if(name!=='_')put(bar,pos,'lead',midi(name),duration*.91);
        pos+=duration;
      }
      if(pos!==16)throw Error('Score bar length '+bar+': '+pos);
      // Moving eighth-note bass; the final note leads into the next chord.
      const next=chords[harmony[(bar+1)%32]].bass;
      const bass=[0,0,12,7,0,12,7,null];
      bass.forEach((interval,i)=>put(bar,i*2,'bass',interval===null?next+(next>=chord.bass?-1:1):chord.bass+interval,1.65));
      // Wide sustained strings let the melody breathe; power chords supply attack.
      chord.notes.forEach(note=>put(bar,0,'strings',note,15.3,section===2?1:.75));
      for(const step of boss?[0,3,6,8,10,14]:[0,6,8,14]){
        put(bar,step,'guitar',chord.bass+12,step===0?2.8:1.3);
        put(bar,step,'guitar',chord.bass+19,step===0?2.8:1.3,.65);
      }
      // B section adds a quieter answering ostinato. Bosses retain it throughout.
      if(section===2||boss){
        [0,2,1,2,0,2,1,2].forEach((n,i)=>put(bar,i*2+1,'spark',chord.notes[n]+12,.85,boss?.65:1));
      }
      const kicks=boss?[0,2,6,8,10,14]:[0,6,8,11];
      kicks.forEach(step=>put(bar,step,'kick',36,1));
      [4,12].forEach(step=>put(bar,step,'snare',38,1));
      for(let step=0;step<16;step+=2)put(bar,step,'hat',42,.5,step%4===0?.7:.45);
      if(bar%4===3){
        for(const step of [13,14,15])put(bar,step,'tom',45-(step-13)*2,1,.65);
        put(bar,15,'snare',38,.6,.5);
      }
      if(bar%8===0)put(bar,0,'crash',49,5,.65);
    });
    return {title:boss?'IRON WILL':'IGNITION',bpm:boss?168:160,bars,steps:512};
  }
  const scores={normal:compose('normal'),boss:compose('boss')};
  const frequency=note=>440*Math.pow(2,(note-69)/12);

  class BattleMusic {
    constructor(ctx,destination){
      this.ctx=ctx;this.sources=new Set();this.mode='normal';this.pending='normal';
      this.step=0;this.timer=null;this.next=0;
      this.bus=ctx.createGain();this.bus.gain.value=.85;this.bus.connect(destination);
      this.echo=ctx.createDelay(.5);this.echo.delayTime.value=.28125;
      const feedback=ctx.createGain();feedback.gain.value=.18;
      this.echoGain=ctx.createGain();this.echoGain.gain.value=.17;
      this.echo.connect(feedback);feedback.connect(this.echo);this.echo.connect(this.echoGain);this.echoGain.connect(this.bus);
      this.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
      const data=this.noise.getChannelData(0);let seed=314159;
      for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=seed/2147483648;}
    }
    setMode(mode){this.pending=mode==='boss'?'boss':'normal';}
    start(mode='normal',reset=false){
      this.setMode(mode);
      if(reset){this.stop();this.step=0;}
      if(this.timer!==null)return;
      this.mode=this.pending;this.next=this.ctx.currentTime+.04;
      this.pump();this.timer=setInterval(()=>this.pump(),40);
    }
    pump(){
      const ctx=this.ctx;if(ctx.state!=='running')return;
      const current=ctx.currentTime;
      // Discard a stale lookahead after suspension instead of emitting a burst.
      if(this.next<current-.12)this.next=current+.025;
      while(this.next<current+.12){
        if(this.step%16===0){this.mode=this.pending;this.echo.delayTime.setValueAtTime(45/scores[this.mode].bpm,this.next);}
        const score=scores[this.mode],unit=60/score.bpm/4;
        for(const event of score.bars[Math.floor(this.step/16)][this.step%16])this.play(event,this.next,unit);
        this.step=(this.step+1)%score.steps;this.next+=unit;
      }
    }
    stop(){
      if(this.timer!==null)clearInterval(this.timer);this.timer=null;
      for(const source of [...this.sources]){try{source.stop(this.ctx.currentTime+.008);}catch{}}
      // Muting the send also clears the audible echo when returning to a result.
      this.bus.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bus.gain.setValueAtTime(0,this.ctx.currentTime);
    }
    play(event,t,unit){
      this.bus.gain.setValueAtTime(.85,t);
      const {instrument,note,duration,gain}=event,d=duration*unit;
      if(['hat','snare','crash'].includes(instrument)){
        const snare=instrument==='snare',crash=instrument==='crash';
        this.voice({noise:true,filter:'highpass',cutoff:snare?1500:crash?6000:8500,t,
          d:snare?.14:crash?.65:.045,attack:.001,volume:(snare?.15:crash?.055:.055)*gain,pan:snare?-.08:.25});
        if(snare)this.voice({freq:185,end:95,type:'triangle',t,d:.1,volume:.1*gain});
        return;
      }
      if(instrument==='kick'||instrument==='tom'){
        this.voice({freq:instrument==='kick'?145:frequency(note+12),end:instrument==='kick'?42:frequency(note),type:'sine',t,d:instrument==='kick'?.2:.17,attack:.002,volume:(instrument==='kick'?.35:.16)*gain});return;
      }
      const f=frequency(note);
      if(instrument==='lead'){
        for(const detune of [-5,5])this.voice({freq:f*Math.pow(2,detune/1200),type:'sawtooth',cutoff:3200,t,d,attack:.009,release:.055,volume:.058*gain,pan:detune/60,echo:true,vibrato:d>.2});
      }else if(instrument==='bass'){
        this.voice({freq:f,type:'sawtooth',cutoff:720,t,d,attack:.005,release:.035,volume:.115*gain});
        this.voice({freq:f,type:'sine',t,d,attack:.004,volume:.07*gain});
      }else if(instrument==='strings'){
        this.voice({freq:f,type:'sawtooth',cutoff:1500,t,d,attack:.16,release:.16,volume:.025*gain,pan:note%2?.4:-.4});
      }else if(instrument==='guitar'){
        this.voice({freq:f,type:'sawtooth',cutoff:1900,t,d,attack:.003,release:.03,volume:.042*gain,pan:-.3});
      }else if(instrument==='spark'){
        this.voice({freq:f,type:'triangle',t,d,attack:.003,release:.03,volume:.045*gain,pan:.38,echo:true});
      }
    }
    voice({freq=440,end,type='sine',noise=false,filter='lowpass',cutoff,t,d,attack=.004,release=.025,volume,pan=0,echo=false,vibrato=false}){
      const ctx=this.ctx,source=noise?ctx.createBufferSource():ctx.createOscillator(),env=ctx.createGain(),nodes=[env];
      if(noise)source.buffer=this.noise;
      else{
        source.type=type;source.frequency.setValueAtTime(freq,t);
        if(end)source.frequency.exponentialRampToValueAtTime(end,t+d);
        if(vibrato){
          // Small pitch motion after the attack, using the oscillator's AudioParam.
          source.frequency.setValueAtTime(freq,t+.08);
          for(let v=.11;v<d;v+=.045)source.frequency.linearRampToValueAtTime(freq*(1+Math.sin(v*38)*.0028),t+v);
        }
      }
      let output=source;
      if(cutoff){const f=ctx.createBiquadFilter();f.type=filter;f.frequency.value=cutoff;f.Q.value=.65;output.connect(f);output=f;nodes.push(f);}
      output.connect(env);
      env.gain.setValueAtTime(.0001,t);env.gain.linearRampToValueAtTime(volume,t+Math.min(attack,d*.4));
      env.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*.65),t+d);
      env.gain.exponentialRampToValueAtTime(.0001,t+d+release);
      if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;env.connect(p);p.connect(this.bus);nodes.push(p);}else env.connect(this.bus);
      if(echo)env.connect(this.echo);
      this.sources.add(source);
      source.onended=()=>{this.sources.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};
      source.start(t);source.stop(t+d+release+.01);
    }
  }
  window.TurnBurstMusic={scores,BattleMusic,midi,frequency};
})();
