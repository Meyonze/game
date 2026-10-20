(function (root) {
  'use strict';
  const W = 7, H = 9;
  const DIRS = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  const inside = (x,y) => x >= 0 && x < W && y >= 0 && y < H;
  const dist = (a,b) => Math.max(Math.abs(a.x-b.x), Math.abs(a.y-b.y));
  const key = (x,y) => `${x},${y}`;
  const STAGES = [
    {name:'接敵宙域',subtitle:'まずは群れを撃ち抜く',turns:10,color:'#7eeaff',enemies:['mite','mite','mite','brute']},
    {name:'鉄壁の門',subtitle:'突進する敵と、最初の大型兵器',turns:10,color:'#ffbd65',boss:'gate',enemies:['mite','mite','brute','gunner','runner']},
    {name:'増殖庭園',subtitle:'分裂する群れを連鎖で一掃',turns:12,color:'#b4fc85',enemies:['mite','mite','splitter','splitter','runner','brute']},
    {name:'雷鳴回廊',subtitle:'砲撃の予告をくぐり抜ける',turns:12,color:'#c19aff',boss:'storm',enemies:['mite','gunner','mortar','runner','brute','splitter']},
    {name:'王の領域',subtitle:'空洞の王を倒し、深層への扉を開く',turns:12,color:'#ff7597',boss:'king',enemies:['mite','mite','splitter','runner','mortar','brute']},
    {name:'灼熱回廊',subtitle:'砲撃をかわし、覚醒した武装で突破',turns:12,color:'#ff9d68',enemies:['mite','mite','mortar','mortar','splitter','brute']},
    {name:'狩人の巣',subtitle:'突進の群れを迎え撃ち、刈り手を倒す',turns:12,color:'#a7f4bd',boss:'reaper',enemies:['mite','runner','runner','runner','splitter','brute']},
    {name:'幻晶庭園',subtitle:'増殖する大群を、育てた火力で砕く',turns:13,color:'#c4afff',enemies:['mite','mite','splitter','splitter','mortar','gunner']},
    {name:'虚空防壁',subtitle:'光の防壁をかわし、深層の番人へ',turns:13,color:'#8ee6ff',boss:'prism',enemies:['mite','brute','brute','gunner','runner','mortar']},
    {name:'創世炉',subtitle:'創世の核を倒し、外縁の戦域へ',turns:10,color:'#ffb5bd',boss:'core',enemies:['mite','mite','splitter','runner','mortar','brute','gunner']},
    {name:'崩落回廊',subtitle:'固定砲と結界兵を、射線に入れて突破',turns:8,color:'#b8c4e7',enemies:['mite','mite','mite','warder','gunner','runner']},
    {name:'甲殻城塞',subtitle:'重装の城主へ。オーバークロック解禁',turns:8,color:'#d6c08e',boss:'bastion',enemies:['mite','mite','mite','warder','brute','mortar']},
    {name:'氷晶縁',subtitle:'凍らない結界兵を優先して撃ち抜く',turns:9,color:'#a0e7f5',enemies:['mite','mite','warder','warder','runner','splitter']},
    {name:'双牙狭間',subtitle:'交差する予告をかわし、双牙の側面へ',turns:8,color:'#b5efa1',boss:'hydra',enemies:['mite','mite','runner','runner','splitter','gunner']},
    {name:'刻印聖堂',subtitle:'狙撃と結界を切り崩し、刻印の主へ',turns:8,color:'#d4a9f0',boss:'oracle',enemies:['mite','mite','warder','gunner','mortar','splitter']},
    {name:'砲火縦深',subtitle:'砲撃の合間を選んで、火力の要を倒す',turns:9,color:'#ffad87',enemies:['mite','mite','mite','mortar','mortar','warder']},
    {name:'熔鉄心臓',subtitle:'回る弱点を追い、炉心の装甲を破る',turns:8,color:'#f6bd72',boss:'forge',enemies:['mite','mite','brute','warder','mortar','splitter']},
    {name:'白夜街道',subtitle:'突進と狙撃を引きつけ、一手で道を開く',turns:9,color:'#e6eab4',enemies:['mite','mite','runner','runner','gunner','warder']},
    {name:'蝕の玉座',subtitle:'蝕の攻撃予告を見切り、光る側へ回る',turns:8,color:'#bfa9ff',boss:'eclipse',enemies:['mite','mite','splitter','warder','runner','brute']},
    {name:'終端宙域',subtitle:'選び抜いた武装で、終端の主を倒す',turns:9,color:'#ffb9df',boss:'origin',enemies:['mite','mite','mite','warder','splitter','runner','mortar','brute']}
  ];
  const BOSS_NAMES={gate:'IRON GATE',storm:'STORM FANG',king:'THE HOLLOW KING',reaper:'THE REAPER',prism:'VOID PRISM',core:'GENESIS CORE',bastion:'THE BASTION',hydra:'TWIN FANG',oracle:'SIGIL ORACLE',forge:'MOLTEN HEART',eclipse:'ECLIPSE',origin:'LAST ORIGIN'};
  const UPGRADES = [
    { id:'blast', name:'連鎖リアクター', icon:'✺', color:'#ffbd65', short:'倒した敵が爆発', desc:['倒した敵が周囲8マスに1ダメージ。爆発で倒した敵も、さらに爆発。','死亡爆発が2ダメージに。固い敵も連鎖に巻き込む。'], max:2 },
    { id:'cross', name:'スプリットランス', icon:'✳', color:'#6de4ff', short:'射撃が3方向に', desc:['移動方向に加え、左右90度にも貫通射撃。','後ろにも発射。4方向を一度に貫く。'], max:2 },
    { id:'pulse', name:'オーバーパルス', icon:'◎', color:'#d6a2ff', short:'近づいて一掃', desc:['毎回出る周囲8マスの衝撃波が2ダメージに。','衝撃波が周囲2マスまで拡大。群れの真ん中が攻撃拠点に。'], max:2 },
    { id:'arc', name:'チェインボルト', icon:'ϟ', color:'#b4fc85', short:'雷が敵から敵へ', desc:['2手ごとに近くの敵から最大3体へ雷が連鎖。各1ダメージ。','2手ごとに最大5体へ連鎖し、各2ダメージに。'], max:2 },
    { id:'lance', name:'メガランス', icon:'↟', color:'#76e7ff', short:'貫通火力アップ', desc:['貫通射撃が2→3ダメージ、射程4→6マスに。','貫通射撃が5ダメージに。ボスにも大打撃。'], max:2 },
    { id:'drone', name:'ハンタードローン', icon:'◈', color:'#ff8ecb', short:'離れた敵も追撃', desc:['2手ごとに近い敵2体を自動射撃。各1ダメージ。','2手ごとに3体へ各2ダメージ。撃ち漏らしを追撃。'], max:2 },
    { id:'armor', name:'リペアアーマー', icon:'✚', color:'#79edb9', short:'全回復＋装甲 / 別枠', desc:['HPを全回復。最大HP＋2。3手ごとに被ダメージを1軽減。武装枠を使わない。','HPを全回復。最大HP＋2。装甲が2手ごとに働く。'], max:2, support:true },
    { id:'meteor', name:'メテオストライク', icon:'☄', color:'#ffad75', short:'強敵の頭上に隕石', desc:['3手ごとにHPが最も高い敵に隕石。周囲8マスごと3ダメージ。','3手ごとに5ダメージの隕石。大型の敵を巻き込んで砕く。'], max:2 },
    { id:'flame', name:'ブレイズトレイル', icon:'♨', color:'#ff826b', short:'移動した跡が燃える', desc:['移動先に3手残る炎。炎の上にいる敵へ毎回1ダメージ。','移動先と周囲8マスに炎。毎回2ダメージ。自分には無害。'], max:2 },
    { id:'frost', name:'フロストコア', icon:'❄', color:'#a5e8ff', short:'撃ち漏らしを凍結', desc:['攻撃が当たった通常敵を1手凍結。解凍後は2手の間、再凍結しない。ボス・結界兵には無効。','凍結が2手に延長。解凍後の2手は再凍結しない。'], max:2 },
    { id:'overclock', name:'オーバークロック', icon:'⇈', color:'#ffe39d', short:'最初の一撃を強化 / 別枠', desc:Array.from({length:3},(_,i)=>`各敵に、その手で最初に当てた一撃だけ＋${i+1}ダメージ。多段攻撃には重複しない。武装枠を使わない。`), max:3, minSector:12, support:true }
  ];
  const AWAKEN={blast:'死亡爆発が周囲2マス・2ダメージに。大きな群れを丸ごと連鎖。',cross:'3手ごとに8方向へ貫通射撃。他の手は4方向射撃。',pulse:'周囲2マスの衝撃波が4ダメージに。密集地を吹き飛ばす。',arc:'2手ごとに最大7体へ、各3ダメージの雷が連鎖。',lance:'貫通射撃が8ダメージ・射程9に。戦場の端まで撃ち抜く。',drone:'2手ごとに4体へ各3ダメージ。遠くの敵まで同時に追撃。'};
  for(const u of UPGRADES)if(AWAKEN[u.id]){u.desc.push(AWAKEN[u.id]);u.max=3;}
  UPGRADES.push(
    {id:'coreburst',name:'極点射撃',icon:'✹',color:'#ffe29b',short:'4手ごとに貫通射撃を増幅',max:20,support:true,core:true,minSector:12,
      desc:Array.from({length:20},(_,i)=>`4手ごとの貫通射撃を＋${i+1}ダメージ。育てた武装と併用できるコア改造。`)},
    {id:'coreguard',name:'予備装甲',icon:'⬡',color:'#8df2be',short:'最大HP＋1・HPを1回復',max:20,support:true,core:true,minSector:12,
      desc:Array.from({length:20},(_,i)=>`最大HPをさらに＋1、HPを1回復。改造による最大HP増加は合計＋${i+1}。`)},
    {id:'coresalvage',name:'部品解析',icon:'⚙',color:'#a7d9ff',short:'部品を集めて、さらに成長',max:20,support:true,core:true,minSector:12,
      desc:Array.from({length:20},(_,i)=>`撃破で得るXPを＋${(i+1)*5}％、撃破スコアを＋${(i+1)*12}％。少数の部品も蓄積する。`)}
  );

  class Game {
    constructor(seed = Date.now()) {
      this.seed = seed >>> 0 || 1;
      this.turn = 0; this.nextId = 1; this.phase = 'play';
      this.player = { x:3, y:5, hp:8, maxHp:8, dx:0, dy:-1 };
      this.enemies = []; this.pickups = []; this.events = [];
      this.upgradeHistory=[];
      this.weapons = Object.fromEntries(UPGRADES.map(u=>[u.id,0]));
      this.slotLimit=4;this.experience=0;this.xpRemainder=0;this.boosted=[];
      this.balanceVersion=6;
      this.kills = 0; this.score = 0; this.bestCombo = 0; this.lastKills = 0;
      this.level = 0; this.xpLevel=0; this.bonusUpgrades=0; this.pendingBonus=false;
      this.thresholds = Array.from({length:32},(_,i)=>i===0?6:Math.round(6+12*i+6*i*i));
      this.offers = []; this.bossSpawned = false; this.bossDead = false;
      this.sectorIndex=0;this.sectorTurn=0;this.bossesDefeated=0;this.clearedSectors=0;this.fires=[];this.splits=[];
      [[3,4],[3,3],[3,2],[2,3],[4,3],[1,5],[0,5],[5,5],[6,5],[1,1],[5,1],[3,0],
       [2,2],[4,2],[1,3],[5,3],[2,8],[4,8]].forEach(([x,y])=>this.addEnemy(x,y,'mite'));
      this.planEnemies();
    }
    random() { this.seed = (Math.imul(this.seed,1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
    clone() { return Object.assign(Object.create(Game.prototype), JSON.parse(JSON.stringify(this))); }
    save(){const state=JSON.parse(JSON.stringify(this));state.events=[];state.explosions=[];state.splits=[];state.boosted=[];if(this.phase==='rest'){state.enemies=[];state.fires=[];}return{version:4,state};}
    static restore(value){
      try{
        if(![2,3,4].includes(value?.version)||!value.state)return null;
        const s=JSON.parse(JSON.stringify(value.state)),legacy=value.version===2,g=new Game(s.seed),integer=n=>Number.isSafeInteger(n)&&n>=0;
        if(!integer(s.seed)||s.seed>4294967295||!['play','upgrade','rest'].includes(s.phase)||!integer(s.turn)||!integer(s.sectorIndex)||s.sectorIndex>=STAGES.length||!integer(s.sectorTurn))return null;
        for(const k of ['kills','score','level','xpLevel','bonusUpgrades','nextId','bossesDefeated','clearedSectors'])if(!integer(s[k]))return null;
        if(s.xpLevel>g.thresholds.length||s.level>128||s.bonusUpgrades>STAGES.length)return null;
        const p=s.player;if(!p||!inside(p.x,p.y)||!integer(p.x)||!integer(p.y)||!integer(p.hp)||p.hp<1||!integer(p.maxHp)||p.hp>p.maxHp||p.maxHp>32||![-1,0,1].includes(p.dx)||![-1,0,1].includes(p.dy)||(!p.dx&&!p.dy))return null;
        if(!s.weapons)return null;
        if(!Object.hasOwn(s.weapons,'overclock'))s.weapons={...s.weapons,overclock:0};
        for(const u of UPGRADES)if(u.core&&!Object.hasOwn(s.weapons,u.id))s.weapons[u.id]=0;
        if(legacy&&integer(s.weapons.overclock)&&s.weapons.overclock<=6)s.weapons.overclock=Math.min(3,s.weapons.overclock);
        if(UPGRADES.some(u=>!integer(s.weapons[u.id])||s.weapons[u.id]>u.max))return null;
        if(p.maxHp>12+s.weapons.coreguard)return null;
        if(s.xpRemainder!==undefined&&(!integer(s.xpRemainder)||s.xpRemainder>=100))return null;
        if(s.upgradeHistory!==undefined){
          if(!Array.isArray(s.upgradeHistory)||s.upgradeHistory.length>128||s.upgradeHistory.length>s.level)return null;
          const ranks={};let lastTurn=0,lastSector=1;
          for(const entry of s.upgradeHistory){
            const u=UPGRADES.find(u=>u.id===entry?.id);
            if(!u||!integer(entry.level)||entry.level<1||entry.level>s.weapons[u.id]||!integer(entry.sector)||entry.sector<lastSector||entry.sector>s.sectorIndex+1||!integer(entry.turn)||entry.turn<lastTurn||entry.turn>s.turn||!['xp','bonus'].includes(entry.source))return null;
            if(ranks[u.id]!==undefined&&entry.level!==ranks[u.id]+1)return null;
            ranks[u.id]=entry.level;lastTurn=entry.turn;lastSector=entry.sector;
          }
        }
        const cell=p=>p&&integer(p.x)&&integer(p.y)&&inside(p.x,p.y);
        if(!Array.isArray(s.enemies)||s.enemies.length>70||s.enemies.some(e=>!cell(e)||!['mite','brute','gunner','runner','splitter','mortar','warder','boss'].includes(e.type)||!integer(e.hp)||e.hp<1||!integer(e.maxHp)||e.hp>e.maxHp||!integer(e.id)||e.id>=s.nextId||!e.intent||!Array.isArray(e.intent.cells)||e.intent.cells.some(p=>!cell(p))))return null;
        if(new Set(s.enemies.map(e=>e.id)).size!==s.enemies.length)return null;
        if(!Array.isArray(s.pickups)||s.pickups.some(p=>!cell(p))||!Array.isArray(s.fires)||s.fires.some(p=>!cell(p)||!integer(p.until)))return null;
        if(!Array.isArray(s.offers)||s.offers.length>3||s.offers.some(id=>!UPGRADES.some(u=>u.id===id))||(s.phase==='upgrade'&&!s.offers.length))return null;
        const owned=UPGRADES.filter(u=>!u.support&&s.weapons[u.id]>0).length;
        if(!legacy&&(!integer(s.slotLimit)||s.slotLimit<4||s.slotLimit>9||owned>s.slotLimit||!integer(s.experience)))return null;
        for(const k of Object.keys(g))if(k!=='thresholds'&&Object.hasOwn(s,k))g[k]=JSON.parse(JSON.stringify(s[k]));
        if(legacy){g.slotLimit=Math.max(4,owned);g.experience=integer(s.experience)?s.experience:s.kills;}
        if(s.balanceVersion!==6){
          g.player.hp=g.player.maxHp;
          for(const e of g.enemies){e.maxHp=Math.max(1,Math.ceil(e.maxHp*.8));e.hp=Math.max(1,Math.min(e.maxHp,Math.ceil(e.hp*.8)));}
        }
        g.balanceVersion=6;
        g.events=[];g.explosions=[];g.splits=[];g.boosted=[];
        if(legacy&&g.phase==='upgrade'){
          if(!g.pendingBonus)g.bonusUpgrades++;
          g.phase='play';g.offers=[];g.pendingBonus=false;g.checkUpgrade();
        }
        if(g.phase==='upgrade'&&g.offers.some(id=>!g.canUpgrade(id)))return null;
        // Older saves can be in the cleanup portion of a defeated boss fight.
        // Migrate directly to the break/result without a second boss reward.
        if(g.stage.boss&&g.bossDead&&g.phase!=='rest')g.clearSector();
        else if(g.phase==='play')g.checkUpgrade();
        return g;
      }catch{return null;}
    }
    get sector() { return this.sectorIndex+1; }
    get stage() { return STAGES[this.sectorIndex]; }
    get reinforcementsOver(){return this.stage.boss?this.bossDead:this.sectorTurn>=this.stage.turns;}
    get ownedWeapons(){return UPGRADES.filter(u=>!u.support&&this.weapons[u.id]>0);}
    get armamentComplete(){return this.ownedWeapons.length>=this.slotLimit&&UPGRADES.filter(u=>!u.core).every(u=>!u.support&&!this.weapons[u.id]||this.weapons[u.id]>=u.max);}
    get buildComplete(){return this.armamentComplete&&UPGRADES.filter(u=>u.core).every(u=>this.weapons[u.id]>=u.max);}
    canUpgrade(id){
      const u=UPGRADES.find(u=>u.id===id);if(!u||this.weapons[id]>=u.max||this.sector<(u.minSector||1))return false;
      if(u.core)return this.armamentComplete;
      if(!u.support&&this.weapons[id]>=2&&this.sector<6)return false;
      return u.support||this.weapons[id]>0||this.ownedWeapons.length<this.slotLimit;
    }
    weaponPeriod(id){return id==='coreburst'?4:['arc','drone'].includes(id)?2:id==='meteor'?3:1;}
    weaponReady(id,turn=this.turn+1){return turn%this.weaponPeriod(id)===0;}
    onWeakSide(boss,p=this.player){return boss.weakSide==='N'?p.y<boss.y-1:boss.weakSide==='S'?p.y>boss.y+1:boss.weakSide==='E'?p.x>boss.x+1:boss.weakSide==='W'?p.x<boss.x-1:false;}
    enemyAt(e,x,y) { return e.type === 'boss' ? Math.max(Math.abs(e.x-x),Math.abs(e.y-y)) <= 1 : e.x===x && e.y===y; }
    occupied(x,y,ignore) { return this.enemies.some(e=>e.id!==ignore && this.enemyAt(e,x,y)); }
    addEnemy(x,y,type='mite') {
      const scaling=Math.min(8,Math.max(0,this.sector-2))+Math.max(0,this.sector-10)*.5;
      const maxHp = {mite:1, brute:4+Math.ceil(scaling*.9), gunner:2+Math.floor(scaling*.5), runner:2+Math.floor(scaling*.4), splitter:5+Math.ceil(scaling*.65), mortar:3+Math.floor(scaling*.45),warder:4+Math.ceil(scaling*.4),boss:85}[type];
      const enemy = {id:this.nextId++, x,y,type,hp:maxHp,maxHp,intent:null};
      this.enemies.push(enemy); return enemy;
    }
    canMove(x,y) {
      return this.phase==='play' && inside(x,y) && dist(this.player,{x,y})<=1 && !this.enemies.some(e=>e.type==='boss'&&this.enemyAt(e,x,y));
    }
    ray(x,y,dx,dy,range=12) {
      const cells=[];
      for(let i=1;i<=range;i++){const xx=x+dx*i,yy=y+dy*i;if(!inside(xx,yy))break;cells.push({x:xx,y:yy});}
      return cells;
    }
    area(x,y,r) {
      const cells=[];
      for(let yy=y-r;yy<=y+r;yy++)for(let xx=x-r;xx<=x+r;xx++)if(inside(xx,yy))cells.push({x:xx,y:yy});
      return cells;
    }
    attackCells(x,y) {
      let dx=Math.sign(x-this.player.x),dy=Math.sign(y-this.player.y);
      if(!dx&&!dy){dx=this.player.dx;dy=this.player.dy;}
      const dirs=[[dx,dy]];
      const cross=this.weapons.cross===3&&(this.turn+1)%3!==0?2:this.weapons.cross;
      if(cross===3){dirs.length=0;dirs.push(...DIRS);}
      else if(this.weapons.cross)dirs.push([-dy,dx],[dy,-dx]);
      if(cross===2)dirs.push([-dx,-dy]);
      const beams=dirs.map(([a,b])=>this.ray(x,y,a,b,this.weapons.lance===3?9:this.weapons.lance?6:4));
      const pulse=this.area(x,y,this.weapons.pulse>1?2:1);
      return {dx,dy,beams,pulse};
    }
    preview(x,y) {
      if(!this.canMove(x,y))return null;
      const clone=this.clone(), attack=this.attackCells(x,y), oldHp=this.player.hp;
      clone.step(x,y);
      const killed=new Set(clone.events.filter(e=>e.type==='death').map(e=>e.id));
      const frozen=new Set(clone.events.filter(e=>e.type==='freeze').map(e=>e.id));
      const bossKilled=clone.events.some(e=>e.type==='death'&&e.kind==='boss');
      const stopped=this.enemies.filter(e=>killed.has(e.id)||frozen.has(e.id)||e.frozen>0||bossKilled).map(e=>e.id);
      const threats=this.enemies.filter(e=>!(e.frozen>0)&&e.intent?.cells.some(p=>p.x===x&&p.y===y)).map(e=>({
        id:e.id,x:e.x,y:e.y,type:e.type,kind:e.intent.kind,
        state:killed.has(e.id)?'killed':bossKilled?'bossStopped':frozen.has(e.id)?'frozen':'hit',
        power:['boss','brute','mortar','warder'].includes(e.type)?2:1
      }));
      const rawDamage=threats.filter(e=>e.state==='hit').reduce((sum,e)=>sum+e.power,0);
      const damage=clone.events.filter(e=>e.type==='hurt').reduce((n,e)=>n+e.amount,0);
      return {kills:clone.lastKills,damage,rawDamage,armorBlocked:Math.max(0,Math.min(2,rawDamage)-damage),threats,stopped,
        heal:Math.max(0,clone.player.hp-oldHp),beams:attack.beams,pulse:attack.pulse,events:clone.events,
        bossDamage:clone.events.filter(e=>e.type==='hit'&&e.boss).reduce((n,e)=>n+e.amount,0)};
    }
    planEnemies() {
      const reserved=new Set();
      for(const e of this.enemies) {
        if(e.type==='boss') {
          if(e.variant){const sides=e.y<4?['S','E','W']:['N','W','E'];e.weakSide=sides[Math.floor(Math.max(0,this.sectorTurn-(e.bornTurn||0))/4)%sides.length];}
          const mode=(this.sectorTurn-(e.bornTurn||0))%3,cells=[];
          for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
            let hit=mode===0?(x===this.player.x||y===this.player.y):mode===1?(x%2===0):(y%2===0);
            if(e.variant==='storm'&&mode===1)hit=(x+y)%3===this.sectorTurn%3;
            if(e.variant==='king'&&mode===1)hit=x%2===1||y%2===1;
            if(e.variant==='king'&&mode===2)hit=(x+y)%2===this.sectorTurn%2;
            if(e.variant==='reaper')hit=mode===0?x-y===this.player.x-this.player.y:mode===1?y%3===this.sectorTurn%3:x===this.player.x||y===this.player.y;
            if(e.variant==='prism')hit=mode===0?x%2===0:mode===1?(x+y)%3===this.sectorTurn%3:x===this.player.x||y===this.player.y;
            if(e.variant==='core')hit=mode===0?x===this.player.x||y===this.player.y:mode===1?(x+y)%2===this.sectorTurn%2:x===0||x===W-1||y===0||y===H-1;
            if(e.variant==='bastion')hit=mode===0?y===this.player.y:mode===1?x%3===this.sectorTurn%3:x===this.player.x||y===this.player.y;
            if(e.variant==='hydra')hit=mode===0?Math.abs(x-this.player.x)===Math.abs(y-this.player.y):mode===1?y%3===this.sectorTurn%3:x===this.player.x;
            if(e.variant==='oracle')hit=mode===0?(x+y)%3===this.sectorTurn%3:mode===1?x-y===this.player.x-this.player.y:x===this.player.x||y===this.player.y;
            if(e.variant==='forge')hit=mode===0?x%2===this.sectorTurn%2:mode===1?y===this.player.y:x===0||x===W-1||y===0||y===H-1;
            if(e.variant==='eclipse')hit=mode===0?(x+y)%2===this.sectorTurn%2:mode===1?x===this.player.x||y===this.player.y:Math.abs(x-this.player.x)===Math.abs(y-this.player.y);
            if(e.variant==='origin')hit=mode===0?x===this.player.x||y===this.player.y:mode===1?(x+y)%3===this.sectorTurn%3:x===0||x===W-1||y===0||y===H-1;
            if(hit)cells.push({x,y});
          }
          e.intent={kind:'boss',cells:(this.sectorTurn-(e.bornTurn||0))%4===3?[]:cells};continue;
        }
        if(e.type==='warder'&&(this.turn+e.id)%3===0){e.intent={kind:'shot',cells:Array.from({length:W},(_,x)=>({x,y:this.player.y}))};continue;}
        if(e.type==='mortar'&&(this.turn+e.id)%3===0){
          e.intent={kind:'shell',cells:this.area(this.player.x,this.player.y,1).filter(p=>p.x===this.player.x||p.y===this.player.y)};continue;
        }
        if(e.type==='gunner'&&(this.turn+e.id)%3===0) {
          const dx=Math.sign(this.player.x-e.x),dy=Math.sign(this.player.y-e.y);
          // An aimed eight-direction shot, with every hit cell shown before the turn.
          const aligned=e.x===this.player.x||e.y===this.player.y||Math.abs(e.x-this.player.x)===Math.abs(e.y-this.player.y);
          if(aligned&&(dx||dy)){e.intent={kind:'shot',cells:this.ray(e.x,e.y,dx,dy)};continue;}
        }
        if(e.type==='brute'&&(this.turn+e.id)%2===0) {
          e.intent={kind:'smash',cells:this.area(e.x,e.y,1)};continue;
        }
        const candidates=DIRS.map(([dx,dy],i)=>({x:e.x+dx,y:e.y+dy,i})).filter(p=>inside(p.x,p.y)&&!this.occupied(p.x,p.y,e.id)&&!reserved.has(key(p.x,p.y)));
        candidates.sort((a,b)=>(Math.abs(a.x-this.player.x)+Math.abs(a.y-this.player.y))-(Math.abs(b.x-this.player.x)+Math.abs(b.y-this.player.y))||a.i-b.i);
        const dest=candidates[0]||{x:e.x,y:e.y};
        // Never walk away simply because a front row is occupied.
        const stay=dist(dest,this.player)>dist(e,this.player);
        let target=stay?{x:e.x,y:e.y}:{x:dest.x,y:dest.y};
        if(e.type==='runner'&&!stay){
          const xx=target.x+Math.sign(target.x-e.x),yy=target.y+Math.sign(target.y-e.y);
          if(inside(xx,yy)&&!this.occupied(xx,yy,e.id)&&!reserved.has(key(xx,yy))&&dist({x:xx,y:yy},this.player)<=dist(target,this.player))target={x:xx,y:yy};
        }
        reserved.add(key(target.x,target.y));
        e.intent={kind:'move',cells:[target],x:target.x,y:target.y};
      }
    }
    hitCells(cells,amount,depth=0,source='weapon') {
      const victims=this.enemies.filter(e=>e.hp>0&&cells.some(p=>this.enemyAt(e,p.x,p.y)));
      for(const e of victims)this.hit(e,amount,depth,source);
    }
    hit(e,amount,depth=0,source='weapon') {
      if(e.hp<=0)return;
      if(!this.boosted.includes(e.id)){amount+=this.weapons.overclock||0;this.boosted.push(e.id);}
      if(e.type==='warder'&&['blast','fire'].includes(source))amount=Math.max(1,Math.floor(amount/3));
      if(e.type==='boss'&&e.weakSide&&this.onWeakSide(e))amount*=2;
      const dealt=Math.min(e.hp,amount); e.hp-=amount;
      if(this.weapons.frost&&!['boss','warder'].includes(e.type)&&e.hp>0&&this.turn>=(e.thawAt||0)){e.frozen=this.weapons.frost;e.thawAt=this.turn+this.weapons.frost+2;}
      this.events.push({type:'hit',id:e.id,x:e.x,y:e.y,amount:dealt,depth,boss:e.type==='boss'});
      if(e.hp<=0) {
        this.events.push({type:'death',id:e.id,x:e.x,y:e.y,kind:e.type,depth});
        this.lastKills++; this.kills++;
        if(!e.summoned){
          const base=e.type==='boss'?5:['brute','warder'].includes(e.type)?2:1;
          const points=base*(100+this.weapons.coresalvage*5)+this.xpRemainder;
          this.experience+=Math.floor(points/100);this.xpRemainder=points%100;
        }
        if(e.type==='boss'){this.bossDead=true;this.bossesDefeated++;}
        if(e.type==='splitter')this.splits.push({x:e.x,y:e.y});
        if(this.weapons.blast&&e.type!=='boss')this.explosions.push({x:e.x,y:e.y,depth:depth+1});
      }
    }
    step(x,y) {
      if(!this.canMove(x,y))return false;
      const wasOver=this.reinforcementsOver;
      this.events=[];this.explosions=[];this.splits=[];this.boosted=[];this.lastKills=0;
      const attack=this.attackCells(x,y);
      this.player.x=x;this.player.y=y;this.player.dx=attack.dx;this.player.dy=attack.dy;
      this.turn++;
      this.sectorTurn++;
      const heal=this.pickups.find(p=>p.x===x&&p.y===y);
      if(heal){const amount=Math.min(4,this.player.maxHp-this.player.hp);this.player.hp+=amount;this.pickups=this.pickups.filter(p=>p!==heal);this.events.push({type:'heal',x,y,amount});}
      for(const cells of attack.beams) {
        this.events.push({type:'beam',x,y,cells,charged:this.weapons.coreburst>0&&this.turn%4===0});
        this.hitCells(cells,[2,3,5,8][this.weapons.lance]+(this.turn%4===0?this.weapons.coreburst:0));
      }
      this.events.push({type:'pulse',x,y,r:this.weapons.pulse>1?2:1});
      this.hitCells(attack.pulse,this.weapons.pulse===3?4:this.weapons.pulse?2:1);
      if(this.weapons.arc&&this.weaponReady('arc',this.turn)) {
        let origin={x,y}, used=new Set();
        for(let i=0;i<([0,3,5,7][this.weapons.arc]);i++) {
          const next=this.enemies.filter(e=>e.hp>0&&!used.has(e.id)&&dist(e,origin)<=3).sort((a,b)=>dist(a,origin)-dist(b,origin)||a.id-b.id)[0];
          if(!next)break;
          this.events.push({type:'arc',from:{x:origin.x,y:origin.y},to:{x:next.x,y:next.y},depth:i*.4});
          used.add(next.id);this.hit(next,this.weapons.arc,i*.4);origin=next;
        }
      }
      if(this.weapons.drone&&this.weaponReady('drone',this.turn)) {
        this.enemies.filter(e=>e.hp>0).sort((a,b)=>dist(a,this.player)-dist(b,this.player)||a.id-b.id).slice(0,[0,2,3,4][this.weapons.drone]).forEach((e,i)=>{
          this.events.push({type:'drone',from:{x,y},to:{x:e.x,y:e.y},depth:i*.4});this.hit(e,this.weapons.drone,i*.4);
        });
      }
      if(this.weapons.meteor&&this.weaponReady('meteor',this.turn)){
        const target=this.enemies.filter(e=>e.hp>0).sort((a,b)=>b.hp-a.hp||dist(a,this.player)-dist(b,this.player))[0];
        if(target){this.events.push({type:'meteor',x:target.x,y:target.y});this.hitCells(this.area(target.x,target.y,1),this.weapons.meteor===2?5:3,1);}
      }
      this.fires=this.fires.filter(f=>f.until>=this.turn);
      if(this.weapons.flame){
        for(const p of this.area(x,y,this.weapons.flame===2?1:0)){
          const old=this.fires.find(f=>f.x===p.x&&f.y===p.y);if(old)old.until=this.turn+2;else this.fires.push({...p,until:this.turn+2});
        }
      }
      if(this.fires.length){this.events.push({type:'fire',cells:this.fires.map(f=>({x:f.x,y:f.y}))});this.hitCells(this.fires,this.weapons.flame||1,1,'fire');}
      for(let i=0;i<this.explosions.length;i++) {
        const ex=this.explosions[i];this.events.push({type:'boom',...ex});
        this.hitCells(this.area(ex.x,ex.y,this.weapons.blast===3?2:1),Math.min(2,this.weapons.blast),ex.depth,'blast');
      }
      this.enemies=this.enemies.filter(e=>e.hp>0);
      this.score+=Math.round(this.lastKills*100*(1+Math.max(0,this.lastKills-1)*.18)*(1+this.weapons.coresalvage*.12));
      this.bestCombo=Math.max(this.bestCombo,this.lastKills);
      const bossDied=this.events.some(e=>e.type==='death'&&e.kind==='boss');
      if(this.stage.boss&&bossDied){
        this.events.push({type:'reinforcementsEnd',bossDied:true});this.clearSector();return true;
      }
      let damage=0;
      for(const e of this.enemies) {
        if(bossDied)continue;
        const intent=e.intent;if(!intent)continue;
        if(e.frozen>0){e.frozen--;this.events.push({type:'freeze',id:e.id,x:e.x,y:e.y});continue;}
        if(intent.cells.some(p=>p.x===x&&p.y===y))damage+=['boss','brute','mortar','warder'].includes(e.type)?2:1;
        if(intent.kind==='move') { e.x=intent.x;e.y=intent.y; }
        else this.events.push({type:'enemyAttack',id:e.id,x:e.x,y:e.y,kind:intent.kind,cells:intent.cells});
      }
      const armor=this.weapons.armor&&this.turn%(this.weapons.armor>1?2:3)===0?1:0;
      damage=Math.max(0,Math.min(2,damage)-armor);
      if(damage){this.player.hp-=damage;this.events.push({type:'hurt',x,y,amount:damage});}
      if(this.player.hp<=0){this.player.hp=0;this.phase='lost';return true;}
      for(const s of this.splits)for(const [dx,dy] of DIRS){
        const xx=s.x+dx,yy=s.y+dy;
        if(inside(xx,yy)&&!this.occupied(xx,yy)&&!(xx===x&&yy===y)){
          const child=this.addEnemy(xx,yy,'mite');child.summoned=true;this.events.push({type:'spawn',id:child.id,x:xx,y:yy});
          s.children=(s.children||0)+1;if(s.children===2)break;
        }
      }
      if(!wasOver&&this.reinforcementsOver)this.events.push({type:'reinforcementsEnd',bossDied});
      if(this.reinforcementsOver&&!this.enemies.length){this.clearSector();return true;}
      if(this.sectorTurn>=this.stage.turns&&this.stage.boss&&!this.bossSpawned&&!this.bossDead)this.spawnBoss();
      this.spawnWave();
      if(this.sectorTurn%4===3)this.spawnMedkit();
      this.planEnemies();
      this.checkUpgrade();
      return true;
    }
    spawnWave() {
      if(this.reinforcementsOver)return;
      const count=this.bossSpawned?this.sectorTurn%2:this.sector<3?2:[1,4,2,3][this.sectorTurn%4];
      const edges=[];
      for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(x===0||x===W-1||y===0||y===H-1)edges.push({x,y});
      // Fisher–Yates keeps seeded runs reproducible across browsers.
      for(let i=edges.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[edges[i],edges[j]]=[edges[j],edges[i]];}
      let spawned=0;
      for(const p of edges) {
        if(spawned>=count||this.enemies.length>=22)break;
        if(this.occupied(p.x,p.y)||dist(p,this.player)<2||this.pickups.some(q=>q.x===p.x&&q.y===p.y))continue;
        const types=this.stage.enemies;
        const type=types[Math.floor(this.random()*types.length)];
        const enemy=this.addEnemy(p.x,p.y,type);this.events.push({type:'spawn',id:enemy.id,x:p.x,y:p.y});spawned++;
      }
    }
    spawnBoss() {
      this.bossSpawned=true;
      // The boss arrives at the opposite end of the arena, never on the player.
      const y=this.player.y<4?7:1;
      const displaced=this.enemies.filter(e=>Math.max(Math.abs(e.x-3),Math.abs(e.y-y))<=1);
      for(const e of displaced){
        const spaces=[];
        for(let yy=0;yy<H;yy++)for(let xx=0;xx<W;xx++)if(Math.max(Math.abs(xx-3),Math.abs(yy-y))>1&&!this.occupied(xx,yy)&&!(xx===this.player.x&&yy===this.player.y))spaces.push({x:xx,y:yy});
        spaces.sort((a,b)=>dist(a,e)-dist(b,e));
        if(spaces.length){e.x=spaces[0].x;e.y=spaces[0].y;}
      }
      this.pickups=this.pickups.filter(p=>Math.max(Math.abs(p.x-3),Math.abs(p.y-y))>1);
      const boss=this.addEnemy(3,y,'boss');
      boss.variant=this.stage.boss||'king';boss.maxHp=boss.hp={gate:60,storm:90,king:120,reaper:145,prism:175,core:200,bastion:230,hydra:265,oracle:290,forge:325,eclipse:375,origin:430}[boss.variant];boss.bornTurn=this.sectorTurn;
      this.events.push({type:'bossEnter',id:boss.id,x:3,y});
    }
    clearSector(){
      if(this.clearedSectors>=this.sector)return false;
      const bossClear=this.stage.boss&&this.bossDead;
      if(this.enemies.some(e=>e.hp>0)&&!bossClear)return false;
      if(bossClear){
        const survivors=this.enemies.filter(e=>e.hp>0);
        for(const e of survivors)this.events.push({type:'disabled',id:e.id,x:e.x,y:e.y,kind:e.type});
        if(survivors.length){const boss=this.events.find(e=>e.type==='death'&&e.kind==='boss');this.events.push({type:'networkDown',x:boss?.x??this.player.x,y:boss?.y??this.player.y,count:survivors.length});}
      }
      this.enemies=[];
      this.clearedSectors=this.sector;this.score+=this.sector*2000+this.player.hp*100;
      this.events.push({type:'sectorClear',sector:this.sector});
      if(this.sector===STAGES.length){this.phase='won';this.score+=15000+Math.max(0,520-this.turn)*100;return true;}
      this.phase='rest';this.offers=[];
      return true;
    }
    nextSector(){
      if(this.phase!=='rest')return false;
      this.sectorIndex++;this.sectorTurn=0;this.bossSpawned=false;this.bossDead=false;
      this.enemies=[];this.pickups=[];this.fires=[];this.events=[];this.player.x=3;this.player.y=5;this.player.dx=0;this.player.dy=-1;
      this.player.hp=this.player.maxHp;
      if(STAGES[this.sectorIndex-1].boss&&!this.buildComplete)this.bonusUpgrades++;
      this.phase='play';
      const candidates=[];
      for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(dist({x,y},this.player)>=2)candidates.push({x,y});
      for(let i=candidates.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
      candidates.slice(0,Math.min(16,9+this.sector)).forEach((p,i)=>this.addEnemy(p.x,p.y,this.stage.enemies[i%this.stage.enemies.length]));
      this.planEnemies();this.checkUpgrade();return true;
    }
    spawnMedkit() {
      const cells=[];
      for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(!this.occupied(x,y)&&dist({x,y},this.player)>0&&!this.pickups.some(p=>p.x===x&&p.y===y))cells.push({x,y});
      cells.sort((a,b)=>dist(a,this.player)-dist(b,this.player));
      if(cells.length)this.pickups.push(cells[Math.min(cells.length-1,Math.floor(this.random()*Math.min(5,cells.length)))]);
      if(this.pickups.length>3)this.pickups.shift();
    }
    checkUpgrade() {
      if(this.phase!=='play'||(!this.bonusUpgrades&&(this.xpLevel>=this.thresholds.length||this.experience<this.thresholds[this.xpLevel])))return;
      const available=UPGRADES.filter(u=>this.canUpgrade(u.id));
      if(!available.length)return;
      this.pendingBonus=this.bonusUpgrades>0;
      for(let i=available.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[available[i],available[j]]=[available[j],available[i]];}
      // First choice immediately exposes the three different ways a build can grow.
      if(this.level===0&&['blast','cross','pulse'].every(id=>available.some(u=>u.id===id)))this.offers=['blast','cross','pulse'];
      else {
        this.offers=available.slice(0,3).map(u=>u.id);
        if(this.player.hp<=4&&this.weapons.armor<2&&!this.offers.includes('armor'))this.offers[2]='armor';
      }
      this.phase='upgrade';
    }
    choose(id) {
      if(this.phase!=='upgrade'||!this.offers.includes(id))return false;
      const upgrade=UPGRADES.find(u=>u.id===id);
      if(!upgrade||!this.canUpgrade(id))return false;
      this.weapons[id]++;this.level++;if(this.pendingBonus)this.bonusUpgrades--;else this.xpLevel++;
      this.upgradeHistory.push({id,level:this.weapons[id],sector:this.sector,turn:this.turn,source:this.pendingBonus?'bonus':'xp'});
      this.pendingBonus=false;this.offers=[];this.phase='play';
      if(id==='armor'){this.player.maxHp+=2;this.player.hp=this.player.maxHp;}
      if(id==='coreguard'){this.player.maxHp++;this.player.hp=Math.min(this.player.maxHp,this.player.hp+1);}
      // A large chain can earn multiple choices; don't silently lose earned levels.
      this.checkUpgrade();return true;
    }
  }
  const API={Game,UPGRADES,STAGES,BOSS_NAMES,W,H,DIRS,inside,dist};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  else root.TurnBurst=API;
})(typeof window!=='undefined'?window:globalThis);
