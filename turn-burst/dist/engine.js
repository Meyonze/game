(function (root) {
  'use strict';
  const W = 7, H = 9;
  const DIRS = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  const inside = (x,y) => x >= 0 && x < W && y >= 0 && y < H;
  const dist = (a,b) => Math.max(Math.abs(a.x-b.x), Math.abs(a.y-b.y));
  const key = (x,y) => `${x},${y}`;
  const UPGRADES = [
    { id:'blast', name:'連鎖リアクター', icon:'✺', color:'#ffbd65', short:'倒した敵が爆発', desc:['倒した敵が周囲8マスに1ダメージ。爆発で倒した敵も、さらに爆発。','死亡爆発が2ダメージに。固い敵も連鎖に巻き込む。'], max:2 },
    { id:'cross', name:'スプリットランス', icon:'✳', color:'#6de4ff', short:'射撃が3方向に', desc:['移動方向に加え、左右90度にも貫通射撃。','後ろにも発射。4方向を一度に貫く。'], max:2 },
    { id:'pulse', name:'オーバーパルス', icon:'◎', color:'#d6a2ff', short:'近づいて一掃', desc:['毎回出る周囲8マスの衝撃波が2ダメージに。','衝撃波が周囲2マスまで拡大。群れの真ん中が攻撃拠点に。'], max:2 },
    { id:'arc', name:'チェインボルト', icon:'ϟ', color:'#b4fc85', short:'雷が敵から敵へ', desc:['近くの敵から最大4体へ雷が連鎖。各1ダメージ。','雷が最大7体へ連鎖し、各2ダメージに。'], max:2 },
    { id:'lance', name:'メガランス', icon:'↟', color:'#76e7ff', short:'貫通火力アップ', desc:['貫通射撃が2→3ダメージ、射程4→6マスに。','貫通射撃が5ダメージに。ボスにも大打撃。'], max:2 },
    { id:'drone', name:'ハンタードローン', icon:'◈', color:'#ff8ecb', short:'離れた敵も追撃', desc:['近い敵3体を自動射撃。各1ダメージ。','5体に各2ダメージ。撃ち漏らしを一掃。'], max:2 },
    { id:'armor', name:'リペアアーマー', icon:'✚', color:'#79edb9', short:'全回復＋装甲', desc:['HPを全回復。最大HP＋2。3手ごとに被ダメージを1軽減。','HPを全回復。最大HP＋2。装甲が2手ごとに働く。'], max:2 }
  ];

  class Game {
    constructor(seed = Date.now()) {
      this.seed = seed >>> 0 || 1;
      this.turn = 0; this.nextId = 1; this.phase = 'play';
      this.player = { x:3, y:5, hp:8, maxHp:8, dx:0, dy:-1 };
      this.enemies = []; this.pickups = []; this.events = [];
      this.weapons = { lance:0, pulse:0, cross:0, blast:0, arc:0, drone:0, armor:0 };
      this.kills = 0; this.score = 0; this.bestCombo = 0; this.lastKills = 0;
      this.level = 0; this.thresholds = [6,15,27,42,60,84,112,145];
      this.offers = []; this.bossSpawned = false; this.bossDead = false;
      [[3,4],[3,3],[3,2],[2,3],[4,3],[1,5],[0,5],[5,5],[6,5],[1,1],[5,1],[3,0],
       [2,2],[4,2],[1,3],[5,3],[0,4],[6,4],[1,6],[5,6],[2,8],[4,8]].forEach(([x,y])=>this.addEnemy(x,y,'mite'));
      this.planEnemies();
    }
    random() { this.seed = (Math.imul(this.seed,1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
    clone() { return Object.assign(Object.create(Game.prototype), JSON.parse(JSON.stringify(this))); }
    get sector() { return this.turn < 8 ? 1 : this.turn < 18 ? 2 : 3; }
    enemyAt(e,x,y) { return e.type === 'boss' ? Math.max(Math.abs(e.x-x),Math.abs(e.y-y)) <= 1 : e.x===x && e.y===y; }
    occupied(x,y,ignore) { return this.enemies.some(e=>e.id!==ignore && this.enemyAt(e,x,y)); }
    addEnemy(x,y,type='mite') {
      const maxHp = {mite:1, brute:4, gunner:2, boss:85}[type];
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
      if(this.weapons.cross)dirs.push([-dy,dx],[dy,-dx]);
      if(this.weapons.cross>1)dirs.push([-dx,-dy]);
      const beams=dirs.map(([a,b])=>this.ray(x,y,a,b,this.weapons.lance?6:4));
      const pulse=this.area(x,y,this.weapons.pulse>1?2:1);
      return {dx,dy,beams,pulse};
    }
    preview(x,y) {
      if(!this.canMove(x,y))return null;
      const clone=this.clone(), attack=this.attackCells(x,y), oldHp=this.player.hp;
      clone.step(x,y);
      return {kills:clone.lastKills, damage:clone.events.filter(e=>e.type==='hurt').reduce((n,e)=>n+e.amount,0), heal:Math.max(0,clone.player.hp-oldHp), beams:attack.beams,pulse:attack.pulse, events:clone.events, bossDamage:clone.events.filter(e=>e.type==='hit'&&e.boss).reduce((n,e)=>n+e.amount,0)};
    }
    planEnemies() {
      const reserved=new Set();
      for(const e of this.enemies) {
        if(e.type==='boss') {
          const mode=(this.turn-18)%3,cells=[];
          for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
            const hit=mode===0?(x===this.player.x||y===this.player.y):mode===1?(x%2===0):(y%2===0);
            if(hit)cells.push({x,y});
          }
          e.intent={kind:'boss',cells};continue;
        }
        if(e.type==='gunner'&&(this.turn+e.id)%3!==0) {
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
        const target=stay?{x:e.x,y:e.y}:{x:dest.x,y:dest.y};
        reserved.add(key(target.x,target.y));
        e.intent={kind:'move',cells:[target],x:target.x,y:target.y};
      }
    }
    hitCells(cells,amount,depth=0) {
      const victims=this.enemies.filter(e=>e.hp>0&&cells.some(p=>this.enemyAt(e,p.x,p.y)));
      for(const e of victims)this.hit(e,amount,depth);
    }
    hit(e,amount,depth=0) {
      if(e.hp<=0)return;
      const dealt=Math.min(e.hp,amount); e.hp-=amount;
      this.events.push({type:'hit',id:e.id,x:e.x,y:e.y,amount:dealt,depth,boss:e.type==='boss'});
      if(e.hp<=0) {
        this.events.push({type:'death',id:e.id,x:e.x,y:e.y,kind:e.type,depth});
        this.lastKills++; this.kills++;
        if(e.type==='boss')this.bossDead=true;
        if(this.weapons.blast&&e.type!=='boss')this.explosions.push({x:e.x,y:e.y,depth:depth+1});
      }
    }
    step(x,y) {
      if(!this.canMove(x,y))return false;
      this.events=[];this.explosions=[];this.lastKills=0;
      const attack=this.attackCells(x,y);
      this.player.x=x;this.player.y=y;this.player.dx=attack.dx;this.player.dy=attack.dy;
      this.turn++;
      const heal=this.pickups.find(p=>p.x===x&&p.y===y);
      if(heal){this.player.hp=Math.min(this.player.maxHp,this.player.hp+3);this.pickups=this.pickups.filter(p=>p!==heal);this.events.push({type:'heal',x,y,amount:3});}
      for(const cells of attack.beams) {
        this.events.push({type:'beam',x,y,cells});
        this.hitCells(cells,[2,3,5][this.weapons.lance]);
      }
      this.events.push({type:'pulse',x,y,r:this.weapons.pulse>1?2:1});
      this.hitCells(attack.pulse,this.weapons.pulse?2:1);
      if(this.weapons.arc) {
        let origin={x,y}, used=new Set();
        for(let i=0;i<(this.weapons.arc>1?7:4);i++) {
          const next=this.enemies.filter(e=>e.hp>0&&!used.has(e.id)&&dist(e,origin)<=3).sort((a,b)=>dist(a,origin)-dist(b,origin)||a.id-b.id)[0];
          if(!next)break;
          this.events.push({type:'arc',from:{x:origin.x,y:origin.y},to:{x:next.x,y:next.y},depth:i*.4});
          used.add(next.id);this.hit(next,this.weapons.arc>1?2:1,i*.4);origin=next;
        }
      }
      if(this.weapons.drone) {
        this.enemies.filter(e=>e.hp>0).sort((a,b)=>dist(a,this.player)-dist(b,this.player)||a.id-b.id).slice(0,this.weapons.drone>1?5:3).forEach((e,i)=>{
          this.events.push({type:'drone',from:{x,y},to:{x:e.x,y:e.y},depth:i*.4});this.hit(e,this.weapons.drone>1?2:1,i*.4);
        });
      }
      for(let i=0;i<this.explosions.length;i++) {
        const ex=this.explosions[i];this.events.push({type:'boom',...ex});
        this.hitCells(this.area(ex.x,ex.y,1),this.weapons.blast,ex.depth);
      }
      this.enemies=this.enemies.filter(e=>e.hp>0);
      this.score+=Math.round(this.lastKills*100*(1+Math.max(0,this.lastKills-1)*.18));
      this.bestCombo=Math.max(this.bestCombo,this.lastKills);
      if(this.bossDead){this.phase='won';this.score+=5000+this.player.hp*250+Math.max(0,45-this.turn)*150;return true;}
      let damage=0;
      for(const e of this.enemies) {
        const intent=e.intent;if(!intent)continue;
        if(intent.cells.some(p=>p.x===x&&p.y===y))damage+=e.type==='boss'||e.type==='brute'?2:1;
        if(intent.kind==='move') { e.x=intent.x;e.y=intent.y; }
        else this.events.push({type:'enemyAttack',id:e.id,x:e.x,y:e.y,kind:intent.kind,cells:intent.cells});
      }
      const armor=this.weapons.armor&&this.turn%(this.weapons.armor>1?2:3)===0?1:0;
      damage=Math.max(0,Math.min(3,damage)-armor);
      if(damage){this.player.hp-=damage;this.events.push({type:'hurt',x,y,amount:damage});}
      if(this.player.hp<=0){this.player.hp=0;this.phase='lost';return true;}
      if(this.turn===18)this.spawnBoss();
      this.spawnWave();
      if([5,11,17,24,31,38].includes(this.turn))this.spawnMedkit();
      this.planEnemies();
      this.checkUpgrade();
      return true;
    }
    spawnWave() {
      const count=this.turn<8?3:this.turn<18?4:this.turn<32?3:4;
      const edges=[];
      for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(x===0||x===W-1||y===0||y===H-1)edges.push({x,y});
      // Fisher–Yates keeps seeded runs reproducible across browsers.
      for(let i=edges.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[edges[i],edges[j]]=[edges[j],edges[i]];}
      let spawned=0;
      for(const p of edges) {
        if(spawned>=count||this.enemies.length>=33)break;
        if(this.occupied(p.x,p.y)||dist(p,this.player)<2||this.pickups.some(q=>q.x===p.x&&q.y===p.y))continue;
        const roll=this.random();
        const type=this.turn>=8&&roll<.2?'brute':this.turn>=8&&roll<.34?'gunner':'mite';
        const enemy=this.addEnemy(p.x,p.y,type);this.events.push({type:'spawn',id:enemy.id,x:p.x,y:p.y});spawned++;
      }
    }
    spawnBoss() {
      this.bossSpawned=true;
      // The boss arrives at the opposite end of the arena, never on the player.
      const y=this.player.y<4?7:1;
      this.enemies=this.enemies.filter(e=>Math.max(Math.abs(e.x-3),Math.abs(e.y-y))>1);
      this.pickups=this.pickups.filter(p=>Math.max(Math.abs(p.x-3),Math.abs(p.y-y))>1);
      const boss=this.addEnemy(3,y,'boss');
      this.events.push({type:'bossEnter',id:boss.id,x:3,y});
    }
    spawnMedkit() {
      const cells=[];
      for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(!this.occupied(x,y)&&dist({x,y},this.player)>0&&!this.pickups.some(p=>p.x===x&&p.y===y))cells.push({x,y});
      cells.sort((a,b)=>dist(a,this.player)-dist(b,this.player));
      if(cells.length)this.pickups.push(cells[Math.min(cells.length-1,Math.floor(this.random()*Math.min(5,cells.length)))]);
      if(this.pickups.length>3)this.pickups.shift();
    }
    checkUpgrade() {
      if(this.level>=this.thresholds.length||this.kills<this.thresholds[this.level])return;
      const available=UPGRADES.filter(u=>this.weapons[u.id]<u.max);
      if(!available.length)return;
      for(let i=available.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[available[i],available[j]]=[available[j],available[i]];}
      // First choice immediately exposes the three different ways a build can grow.
      if(this.level===0)this.offers=['blast','cross','pulse'];
      else {
        this.offers=available.slice(0,3).map(u=>u.id);
        if(this.player.hp<=4&&this.weapons.armor<2&&!this.offers.includes('armor'))this.offers[2]='armor';
      }
      this.phase='upgrade';
    }
    choose(id) {
      if(this.phase!=='upgrade'||!this.offers.includes(id))return false;
      this.weapons[id]++;this.level++;this.offers=[];this.phase='play';
      if(id==='armor'){this.player.maxHp+=2;this.player.hp=this.player.maxHp;}
      // A large chain can earn multiple choices; don't silently lose earned levels.
      this.checkUpgrade();return true;
    }
  }
  const API={Game,UPGRADES,W,H,DIRS,inside,dist};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  else root.TurnBurst=API;
})(typeof window!=='undefined'?window:globalThis);
