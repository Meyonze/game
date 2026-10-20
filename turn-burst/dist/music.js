/* Original scores: IGNITION / IRON WILL / THE LAST ORIGIN / PIXEL AFTERNOON. */
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
  function compose(){
    const bars=Array.from({length:32},()=>Array.from({length:16},()=>[]));
    const put=(bar,step,instrument,note,duration,gain=1)=>bars[bar][step].push({instrument,note,duration,gain});
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
      for(const step of [0,8]){
        put(bar,step,'guitar',chord.bass+12,step===0?2.8:1.3);
        put(bar,step,'guitar',chord.bass+19,step===0?2.8:1.3,.65);
      }
      // The normal theme adds a quieter answering ostinato in its B section.
      if(section===2){
        [0,2,1,2,0,2,1,2].forEach((n,i)=>put(bar,i*2+1,'spark',chord.notes[n]+12,.85,.75));
      }
      [0,6,8].forEach(step=>put(bar,step,'kick',36,1,.72));
      [4,12].forEach(step=>put(bar,step,'snare',38,1,.7));
      for(let step=0;step<16;step+=2)put(bar,step,'hat',42,.5,step%4===0?.7:.45);
      if(bar%4===3){
        for(const step of [13,14,15])put(bar,step,'tom',45-(step-13)*2,1,.65);
        put(bar,15,'snare',38,.6,.5);
      }
      if(bar%8===0)put(bar,0,'crash',49,5,.65);
    });
    return {title:'IGNITION',bpm:144,bars,steps:512};
  }
  function composeBoss(final=false){
    const phrases=final?[
      'D5:6 A5:2 D6:4 C6:2 A5:2','Bb5:4 F5:2 A5:2 Bb5:6 D6:2',
      'G5:4 Bb5:4 D6:4 F6:4','E6:4 Cs6:4 A5:4 G5:2 E5:2',
      'F5:4 A5:2 D6:2 F6:6 E6:2','D6:6 Bb5:2 A5:4 F5:4',
      'G5:2 Bb5:2 D6:4 C6:4 Bb5:4','A5:6 Cs6:2 E6:4 Cs6:4',
      'D6:8 A5:2 F5:2 E5:2 D5:2','F5:4 Bb5:4 D6:6 C6:2',
      'Bb5:4 G5:4 D6:4 Bb5:4','Cs6:6 E6:2 D6:2 Cs6:2 Bb5:2 A5:2',
      'F6:6 E6:2 D6:4 A5:4','Bb5:4 D6:4 F6:4 E6:2 D6:2',
      'E6:2 Cs6:2 A5:4 G5:2 E5:2 Cs5:2 E5:2','A5:4 Cs6:4 E6:4 Cs6:2 A5:2'
    ]:[
      'D5:1 _:1 D5:1 _:1 Eb5:2 D5:2 A5:2 G5:1 F5:1 E5:2 Cs5:2',
      'Bb4:2 D5:1 F5:1 Bb5:2 A5:2 F5:2 D5:2 C5:2 Bb4:2',
      'G5:1 _:1 G5:1 _:1 Bb5:2 A5:2 G5:2 F5:1 D5:1 F5:2 G5:2',
      'Cs5:2 E5:2 A5:2 Bb5:2 A5:2 G5:2 E5:2 Cs5:2',
      'D6:3 A5:1 F5:2 D5:2 F5:1 G5:1 A5:2 C6:2 D6:2',
      'Bb5:2 A5:2 F5:2 D5:2 Bb4:2 D5:2 F5:2 A5:2',
      'Bb5:2 D6:2 G6:2 F6:2 D6:2 Bb5:2 A5:2 G5:2',
      'A5:2 Cs6:2 E6:2 G6:2 E6:2 Cs6:2 Bb5:2 A5:2',
      'D5:1 _:1 D5:2 F5:2 G5:2 A5:4 D6:4',
      'F5:2 Bb5:2 D6:2 C6:2 Bb5:2 A5:2 F5:2 D5:2',
      'G5:2 Bb5:1 D6:1 F6:2 D6:2 Bb5:2 A5:2 G5:2 F5:2',
      'E5:1 F5:1 G5:2 A5:2 Cs6:2 E6:4 Cs6:4',
      'D6:4 A5:2 F5:2 D5:2 F5:2 A5:2 D6:2',
      'Bb5:2 D6:2 F6:4 E6:2 D6:2 C6:2 Bb5:2',
      'Cs6:2 E6:2 A6:2 G6:2 E6:2 Cs6:2 Bb5:2 G5:2',
      'A5:2 G5:2 E5:2 Cs5:2 D5:1 E5:1 F5:1 E5:1 Cs5:2 A4:2'
    ];
    const count=final?32:16,bars=Array.from({length:count},()=>Array.from({length:16},()=>[]));
    const progression='d b g a d b g a d b g a d b a a'.split(' '),shift=final?2:0;
    const put=(b,s,instrument,note,duration,gain=1)=>bars[b][s].push({instrument,note:note+shift,duration,gain});
    for(let b=0;b<count;b++){
      const n=b%16,chord=chords[progression[n]];let pos=0;
      for(const token of phrases[n].split(' ')){
        const [name,d]=token.split(':'),duration=Number(d);
        if(name!=='_')put(b,pos,'bossLead',midi(name),duration*.88,final?.9:1);
        pos+=duration;
      }
      if(pos!==16)throw Error('Boss score length '+b+': '+pos);
      for(const s of [0,2,4,6,8,10,12,14])put(b,s,'bass',chord.bass+([6,14].includes(s)?7:0),1.5);
      for(const s of [0,2,3,6,8,10,11,14]){
        put(b,s,'bossGuitar',chord.bass+12,s%4===0?1.7:.75);
        put(b,s,'bossGuitar',chord.bass+19,s%4===0?1.7:.75,.65);
      }
      for(const s of [0,2,6,7,8,10,14])put(b,s,'kick',36,1);
      [4,12].forEach(s=>put(b,s,'snare',38,1,1.2));
      for(let s=0;s<16;s+=2)put(b,s,'hat',42,.5,.65);
      if(b%4===0)put(b,0,'crash',49,5,.9);
      if(b%4===3)[10,11,13,14,15].forEach((s,i)=>put(b,s,'tom',49-i*2,1,.8));
      if(final){
        chord.notes.forEach(note=>put(b,0,'choir',note,15,.8));
        for(const s of [0,8])chord.notes.slice(0,2).forEach(note=>put(b,s,'bossBrass',note,3,.7));
        if(b>=16)[1,5,9,13].forEach((s,i)=>put(b,s,'spark',chord.notes[i%3]+12,1,1));
      }else for(const s of [0,8])chord.notes.slice(0,2).forEach(note=>put(b,s,'bossBrass',note,2,.7));
    }
    return {title:final?'THE LAST ORIGIN':'IRON WILL',bpm:final?176:184,bars,steps:count*16};
  }
  function composeRetro(){
    const bars=Array.from({length:16},()=>Array.from({length:16},()=>[]));
    const lines=[
      'E5:4 G5:4 A5:2 G5:2 E5:4', 'C5:6 E5:2 G5:4 E5:4',
      'F5:4 A5:4 G5:4 E5:4', 'D5:6 E5:2 G5:4 _:4',
      'E5:4 B4:2 D5:2 G5:4 E5:4', 'C5:4 E5:4 A5:4 G5:4',
      'F5:6 E5:2 D5:4 F5:4', 'G5:6 D5:2 B4:4 _:4',
      'C6:6 B5:2 G5:4 E5:4', 'A5:4 G5:2 E5:2 C5:4 E5:4',
      'A5:6 G5:2 F5:4 E5:4', 'D5:4 G5:4 B5:4 G5:4',
      'E5:6 G5:2 B5:4 A5:4', 'G5:4 E5:4 C5:4 D5:4',
      'F5:4 E5:2 D5:2 G5:4 B4:4', 'C5:8 E5:4 _:4'
    ];
    const roots=[36,33,29,31,28,33,26,31,36,33,29,31,28,33,31,36];
    const triads=[[60,64,67],[60,64,69],[60,65,69],[59,62,67],[59,64,67],[60,64,69],[62,65,69],[59,62,67]];
    const put=(b,s,instrument,note,duration,gain=1)=>bars[b][s].push({instrument,note,duration,gain});
    lines.forEach((line,b)=>{
      let pos=0;
      for(const token of line.split(' ')){
        const [name,d]=token.split(':'),duration=Number(d);
        if(name!=='_')put(b,pos,'chipLead',midi(name),duration*.8);
        pos+=duration;
      }
      if(pos!==16)throw Error('Retro bar length '+b);
      const chord=b===14?triads[3]:b===15?triads[0]:triads[b%8];
      [0,8].forEach((s,i)=>put(b,s,'chipBass',roots[b]+(i?7:0),5.5));
      [2,6,10,14].forEach((s,i)=>put(b,s,'chipArp',chord[[0,1,2,1][i]],1.8));
      put(b,0,'softKick',36,1);put(b,8,'softSnare',38,1);
      [4,12].forEach(s=>put(b,s,'softHat',42,.5));
    });
    return {title:'PIXEL AFTERNOON',bpm:104,bars,steps:256};
  }
  const finalScore=composeBoss(true);
  const scores={normal:compose(),boss:composeBoss(),final:finalScore,finale:{...finalScore,title:'THE LAST ORIGIN · CORE',bpm:196},retro:composeRetro()};
  function softBoss(source,title,bpm){
    const bars=source.bars.map(bar=>bar.map((events,s)=>{
      const out=[];
      for(const e of events){
        if(e.instrument==='bossLead')out.push({...e,instrument:'chipLead',note:e.note-12,gain:.9});
        if(e.instrument==='bass'&&s%4===0)out.push({...e,instrument:'chipBass',duration:3,gain:1});
        if(e.instrument==='bossBrass')out.push({...e,instrument:'chipArp',duration:2,gain:.7});
        if(e.instrument==='kick'&&[0,8,14].includes(s))out.push({...e,instrument:'softKick',gain:.8});
        if(e.instrument==='snare')out.push({...e,instrument:'softSnare',gain:1});
        if(e.instrument==='hat'&&s%4===0)out.push({...e,instrument:'softHat',gain:.7});
      }
      return out;
    }));
    return {title,bpm,bars,steps:source.steps};
  }
  scores.retroBoss=softBoss(scores.boss,'PIXEL / DANGER',120);
  scores.retroFinal=softBoss(scores.final,'PIXEL / LAST ORIGIN',120);
  scores.retroFinale={...scores.retroFinal,title:'PIXEL / LAST CORE',bpm:132};
  const frequency=note=>440*Math.pow(2,(note-69)/12);

  class BattleMusic {
    constructor(ctx,destination,style='battle'){
      this.ctx=ctx;this.sources=new Set();this.mode='normal';this.pending='normal';
      this.style=style==='retro'?'retro':'battle';
      this.step=0;this.timer=null;this.next=0;
      this.bus=ctx.createGain();this.bus.gain.value=.85;this.bus.connect(destination);
      this.echo=ctx.createDelay(.5);this.echo.delayTime.value=.28125;
      const feedback=ctx.createGain();feedback.gain.value=.18;
      this.echoGain=ctx.createGain();this.echoGain.gain.value=.17;
      this.echo.connect(feedback);feedback.connect(this.echo);this.echo.connect(this.echoGain);this.echoGain.connect(this.bus);
      this.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
      const data=this.noise.getChannelData(0);let seed=314159;
      for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=seed/2147483648;}
      this.driveCurve=Float32Array.from({length:1024},(_,i)=>Math.tanh((i/1023*2-1)*3.5)/Math.tanh(3.5));
    }
    get score(){return this.style==='retro'?scores[{normal:'retro',boss:'retroBoss',final:'retroFinal',finale:'retroFinale'}[this.mode]]:scores[this.mode];}
    setStyle(style){
      const next=style==='retro'?'retro':'battle';if(next===this.style)return;
      const playing=this.timer!==null;this.stop();this.style=next;this.step=0;
      // Silence the previous track's delay tail during the change.
      this.echoGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.echoGain.gain.setValueAtTime(0,this.ctx.currentTime);
      this.echoGain.gain.linearRampToValueAtTime(.17,this.ctx.currentTime+.55);
      if(playing)this.start(this.pending);
    }
    setMode(mode){this.pending=['boss','final','finale'].includes(mode)?mode:'normal';}
    transition(mode){
      const previous=this.pending;this.setMode(mode);if(previous===this.pending)return;
      const playing=this.timer!==null;this.stop();this.step=0;this.mode=this.pending;
      if(playing)this.start(this.pending);
    }
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
        if(this.step%16===0){this.mode=this.pending;this.echo.delayTime.setValueAtTime(45/this.score.bpm,this.next);}
        const score=this.score,unit=60/score.bpm/4;
        this.step%=score.steps;
        for(const event of score.bars[Math.floor(this.step/16)][this.step%16])this.play(event,this.next,unit);
        this.step=(this.step+1)%score.steps;this.next+=unit;
      }
    }
    stop(){
      if(this.timer!==null)clearInterval(this.timer);this.timer=null;
      for(const source of [...this.sources]){try{source.stop(this.ctx.currentTime+.025);}catch{}}
      // Muting the send also clears the audible echo when returning to a result.
      this.bus.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bus.gain.setValueAtTime(this.bus.gain.value,this.ctx.currentTime);
      this.bus.gain.linearRampToValueAtTime(0,this.ctx.currentTime+.02);
    }
    play(event,t,unit){
      this.bus.gain.setValueAtTime(.85,t);
      const {instrument,note,duration,gain}=event,d=duration*unit;
      if(instrument==='chipLead'){
        this.voice({freq:frequency(note),type:'square',cutoff:1750,t,d,attack:.012,release:.065,volume:.052*gain,pan:-.06});return;
      }
      if(instrument==='chipBass'){
        this.voice({freq:frequency(note),type:'triangle',cutoff:600,t,d,attack:.012,release:.08,volume:.115*gain});return;
      }
      if(instrument==='chipArp'){
        this.voice({freq:frequency(note),type:'triangle',cutoff:1800,t,d,attack:.009,release:.07,volume:.032*gain,pan:.25});return;
      }
      if(instrument==='softKick'){
        this.voice({freq:90,end:48,type:'sine',t,d:.12,attack:.005,volume:.105*gain});return;
      }
      if(instrument==='softSnare'||instrument==='softHat'){
        this.voice({noise:true,filter:'highpass',cutoff:instrument==='softSnare'?2400:6500,t,d:instrument==='softSnare'?.07:.025,volume:(instrument==='softSnare'?.033:.02)*gain,pan:.08});return;
      }
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
      if(instrument==='bossLead'){
        for(const detune of [-7,7])this.voice({freq:f*Math.pow(2,detune/1200),type:detune<0?'square':'sawtooth',cutoff:4200,t,d,attack:.005,release:.035,volume:.062*gain,pan:detune/25,echo:true,vibrato:d>.2});
      }else if(instrument==='bossGuitar'){
        this.voice({freq:f,type:'sawtooth',drive:true,cutoff:2600,cutoffEnd:1100,t,d,attack:.002,release:.018,sustain:.35,volume:.055*gain,pan:note%2?.32:-.32});
      }else if(instrument==='bossBrass'){
        this.voice({freq:f,type:'square',cutoff:2200,t,d,attack:.016,release:.05,volume:.042*gain,pan:-.2});
      }else if(instrument==='choir'){
        this.voice({freq:f,type:'triangle',cutoff:1100,t,d,attack:.12,release:.14,volume:.052*gain,pan:note%2?.5:-.5});
        this.voice({freq:f*2,type:'sine',t,d,attack:.15,release:.14,volume:.018*gain,pan:note%2?-.4:.4});
      }else if(instrument==='lead'){
        for(const detune of [-5,5])this.voice({freq:f*Math.pow(2,detune/1200),type:'sawtooth',cutoff:3200,t,d,attack:.009,release:.055,volume:.058*gain,pan:detune/60,echo:true,vibrato:d>.2});
      }else if(instrument==='bass'){
        // FM bite, sustained saturation and octave presence bring the bass to
        // the front even on phone speakers. The clean fundamental anchors it.
        const bassGain=gain*1.4;
        this.voice({freq:f,type:'sawtooth',drive:true,cutoff:3400,cutoffEnd:1500,t,d,attack:.0015,release:.025,sustain:.68,volume:.32*bassGain});
        this.voice({freq:f,type:'sine',fm:{ratio:2,index:4,tail:1.15},cutoff:3300,cutoffEnd:1500,t,d,attack:.002,release:.022,sustain:.65,volume:.26*bassGain});
        this.voice({freq:f,type:'sine',t,d,attack:.002,release:.025,volume:.14*bassGain});
        this.voice({freq:f*2,type:'square',cutoff:2900,cutoffEnd:1600,t,d:d*.92,attack:.001,release:.018,sustain:.55,volume:.16*bassGain});
      }else if(instrument==='strings'){
        this.voice({freq:f,type:'sawtooth',cutoff:1500,t,d,attack:.16,release:.16,volume:.025*gain,pan:note%2?.4:-.4});
      }else if(instrument==='guitar'){
        this.voice({freq:f,type:'sawtooth',cutoff:1900,t,d,attack:.003,release:.03,volume:.042*gain,pan:-.3});
      }else if(instrument==='spark'){
        this.voice({freq:f,type:'triangle',t,d,attack:.003,release:.03,volume:.045*gain,pan:.38,echo:true});
      }
    }
    voice({freq=440,end,type='sine',noise=false,filter='lowpass',cutoff,cutoffEnd,drive=false,fm=null,t,d,attack=.004,release=.025,sustain=.65,volume,pan=0,echo=false,vibrato=false}){
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
      if(drive){const shaper=ctx.createWaveShaper();shaper.curve=this.driveCurve;shaper.oversample='2x';output.connect(shaper);output=shaper;nodes.push(shaper);}
      if(cutoff){const f=ctx.createBiquadFilter();f.type=filter;f.frequency.setValueAtTime(cutoff,t);if(cutoffEnd)f.frequency.exponentialRampToValueAtTime(cutoffEnd,t+d);f.Q.value=.65;output.connect(f);output=f;nodes.push(f);}
      output.connect(env);
      env.gain.setValueAtTime(.0001,t);env.gain.linearRampToValueAtTime(volume,t+Math.min(attack,d*.4));
      env.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*sustain),t+d);
      env.gain.exponentialRampToValueAtTime(.0001,t+d+release);
      if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;env.connect(p);p.connect(this.bus);nodes.push(p);}else env.connect(this.bus);
      if(echo)env.connect(this.echo);
      if(fm){
        const mod=ctx.createOscillator(),amount=ctx.createGain();mod.type='sine';mod.frequency.setValueAtTime(freq*fm.ratio,t);
        amount.gain.setValueAtTime(freq*fm.index,t);amount.gain.exponentialRampToValueAtTime(freq*fm.tail,t+Math.min(.075,d));
        mod.connect(amount);amount.connect(source.frequency);this.sources.add(mod);
        mod.onended=()=>{this.sources.delete(mod);mod.disconnect();amount.disconnect();};
        mod.start(t);mod.stop(t+d+release+.01);
      }
      this.sources.add(source);
      source.onended=()=>{this.sources.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};
      source.start(t);source.stop(t+d+release+.01);
    }
  }
  window.TurnBurstMusic={scores,BattleMusic,midi,frequency};
})();
