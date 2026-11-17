import * as T from '../neon-rift-duel/vendor/three.module.js';
const C={ink:'#241b26',red:'#e74d40',deep:'#ae3038',cream:'#ffe5b3',brown:'#85513d',tan:'#ca8a59',gold:'#ffc34c',cloth:'#38303e',pink:'#c58a67'};
export function buildAkamaru(){
 const root=new T.Group();root.name='AKAMARU';const body=new T.Group();root.add(body);const outlines=[],materials=[],parts={};
 const gradient=new T.DataTexture(new Uint8Array([85,170,255]),3,1,T.RedFormat);gradient.minFilter=gradient.magFilter=T.NearestFilter;gradient.generateMipmaps=false;gradient.needsUpdate=true;
 const edgeMat=new T.ShaderMaterial({side:T.BackSide,uniforms:{thickness:{value:3},resolution:{value:new T.Vector2(1280,900)},ink:{value:new T.Color(C.ink)}},vertexShader:`uniform float thickness;uniform vec2 resolution;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vec3 n=normalize(normalMatrix*normal);vec4 c=projectionMatrix*p;vec2 dir=(projectionMatrix*vec4(n,0.)).xy;float l=length(dir);if(l>.0001)c.xy+=dir/l*(thickness*2./resolution)*c.w;gl_Position=c;}`,fragmentShader:'uniform vec3 ink;void main(){gl_FragColor=vec4(ink,1.);}',toneMapped:false});
 function material(color,vertexColors=false){const m=new T.MeshToonMaterial({color,gradientMap:gradient,vertexColors});materials.push(m);return m;}
 const mats=Object.fromEntries(Object.entries(C).map(([k,v])=>[k,material(v)]));
 function add(parent,g,mat,pos=[0,0,0],scale=[1,1,1],outline=true,name=''){const m=new T.Mesh(g,typeof mat==='string'?mats[mat]:mat);m.position.set(...pos);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;m.name=name;parent.add(m);if(outline){const o=new T.Mesh(g,edgeMat);o.name='outline';o.frustumCulled=false;o.renderOrder=-1;m.add(o);outlines.push(o);}return m;}
 const sphere=new T.SphereGeometry(1,40,28);
 const ball=(p,mat,pos,scale,outline=true,name='')=>add(p,sphere,mat,pos,scale,outline,name);
 const group=(p,pos=[0,0,0])=>{const g=new T.Group();g.position.set(...pos);p.add(g);return g;};
 function shape(points,depth=.08,bevel=.045){const s=new T.Shape();s.moveTo(...points[0]);for(let i=1;i<points.length;i++)s.lineTo(...points[i]);s.closePath();const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,steps:1,curveSegments:12});g.translate(0,0,-depth/2);return g;}
 function earGeometry(inner=false){const s=new T.Shape();s.moveTo(-.28,0);s.bezierCurveTo(-.35,.18,-.29,.61,-.13,.72);s.bezierCurveTo(.03,.86,.28,.52,.31,.28);s.quadraticCurveTo(.35,-.05,.15,-.08);s.quadraticCurveTo(-.05,-.14,-.28,0);const g=new T.ExtrudeGeometry(s,{depth:inner?.025:.18,bevelEnabled:true,bevelThickness:inner?.025:.07,bevelSize:inner?.025:.07,bevelSegments:4,curveSegments:20});g.translate(0,0,inner?0:-.09);if(inner)g.scale(.65,.72,1);return g;}
 function line(p,points,color,r=.018){const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));return add(p,new T.TubeGeometry(curve,32,r,8,false),color,[0,0,0],[1,1,1],false);}
 function disc(p,mat,pos,r,depth=.08,outline=true){const m=add(p,new T.CylinderGeometry(r,r,depth,48),mat,pos,[1,1,1],outline);m.rotation.x=Math.PI/2;return m;}
 // Broad chest, short limbs, large head: all surfaces are real geometry.
 ball(body,'cloth',[0,1.85,0],[.66,.74,.44]);ball(body,'cream',[0,1.98,.35],[.48,.46,.18]);
 for(const side of [-1,1]){const panel=ball(body,'red',[side*.53,1.96,.18],[.24,.53,.36]);panel.rotation.z=side*-.15;line(body,[[side*.38,2.3,.46],[side*.5,2.08,.49],[side*.53,1.72,.44]],'deep',.022);}
 const belt=add(body,new T.TorusGeometry(.57,.12,12,64),'cream',[0,1.44,0],[1.15,1,.8]);belt.rotation.x=Math.PI/2;ball(body,'gold',[0,1.46,.52],[.16,.13,.06]);
 const apron=add(body,shape([[-.35,.26],[.35,.26],[.48,-.34],[0,-.42],[-.48,-.34]],.11,.045),'red',[0,1.05,.48]);apron.rotation.x=-.12;
 ball(apron,'cream',[0,-.13,.1],[.13,.10,.018],false);for(const [x,y]of[[-.14,.01],[-.05,.09],[.07,.09],[.15,0]])ball(apron,'cream',[x,y,.1],[.047,.06,.018],false);
 for(const side of [-1,1]){const skirt=add(body,shape([[-.19,.3],[.17,.3],[.27,-.27],[-.25,-.3]],.1,.06),'red',[side*.64,1.15,0]);skirt.rotation.z=side*.25;skirt.rotation.y=side*.5;ball(skirt,'cream',[0,.12,.09],[.17,.035,.025],false);}
 for(const side of [-1,1]){
  const hip=group(body,[side*.39,1.15,.02]);parts[side<0?'legR':'legL']=hip;
  ball(hip,'cloth',[0,-.22,0],[.25,.36,.25]);const knee=group(hip,[0,-.42,0]);parts[side<0?'kneeR':'kneeL']=knee;
  ball(knee,'red',[0,-.02,.16],[.28,.20,.17]);ball(knee,'cream',[0,-.25,0],[.24,.3,.24]);
  const foot=group(knee,[0,-.45,.16]);ball(foot,'cloth',[0,0,0],[.36,.25,.52]);ball(foot,'cream',[0,.045,.16],[.33,.21,.39]);
  line(foot,[[-.15,.15,.44],[-.15,.10,.49],[-.15,.01,.51]],'brown',.012);line(foot,[[.13,.15,.44],[.13,.10,.49],[.13,.01,.51]],'brown',.012);
 }
 // Tail is one continuous striped curved surface, not a stack of primitives.
 const tail=group(body,[0,1.25,-.35]);parts.tail=tail;
 const path=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(.15,-.18,-.48),new T.Vector3(.3,-.1,-1.08),new T.Vector3(.48,.15,-1.52)]);
 const frames=path.computeFrenetFrames(48,false),positions=[],normals=[],colors=[],indices=[];
 for(let i=0;i<=48;i++){const t=i/48,center=path.getPointAt(t),radius=i===48?0:.43*Math.pow(Math.sin(Math.PI*t),.6)+.02;for(let j=0;j<=24;j++){const a=j/24*Math.PI*2,n=frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i],Math.sin(a)),v=center.clone().addScaledVector(n,radius);positions.push(...v);normals.push(...n);const color=new T.Color(Math.floor(t*5)%2?C.brown:C.tan);colors.push(color.r,color.g,color.b);if(i<48&&j<24){const k=i*25+j;indices.push(k,k+25,k+1,k+1,k+25,k+26);}}}
 const tailGeo=new T.BufferGeometry();tailGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));tailGeo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));tailGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));tailGeo.setIndex(indices);add(tail,tailGeo,material('#ffffff',true));
 // Arms with shoulder and elbow pivots for the strike animation.
 for(const side of [-1,1]){
  const arm=group(body,[side*.78,2.19,0]);parts[side<0?'armR':'armL']=arm;arm.rotation.z=side*.22;
  ball(arm,'cloth',[side*.05,-.2,0],[.23,.36,.24]);const pad=ball(arm,'red',[side*.1,.0,.01],[.39,.28,.37]);pad.rotation.z=side*.12;ball(arm,'cream',[side*.1,.07,.30],[.30,.07,.075],false);
  const elbow=group(arm,[side*.08,-.43,0]);parts[side<0?'elbowR':'elbowL']=elbow;
  ball(elbow,'deep',[0,-.16,0],[.28,.30,.29]);ball(elbow,'red',[0,-.12,.19],[.25,.24,.12]);line(elbow,[[-.19,-.18,.29],[0,-.18,.32],[.19,-.18,.29]],'deep',.017);
  const hand=group(elbow,[0,-.43,.025]);parts[side<0?'handR':'handL']=hand;ball(hand,'cloth',[0,0,0],[.26,.25,.24]);ball(hand,'brown',[side*-.18,0,.14],[.11,.16,.12]);
 }
 // Short, broad curved blade. Ivory cutting edge and a dark blade face.
 const sword=group(parts.handR,[0,-.05,.13]);parts.sword=sword;sword.rotation.z=2.55;sword.rotation.y=-.15;
 ball(sword,'cloth',[0,.06,0],[.105,.24,.10]);for(let i=0;i<3;i++)line(sword,[[-.07,-.06+i*.09,.09],[.07,.02+i*.09,.09]],'tan',.016);
 const guard=add(sword,new T.TorusGeometry(.20,.055,10,40),'gold',[0,.29,0],[1,1,.75]);guard.rotation.x=Math.PI/2;
 const bladePoints=[[-.12,.34],[.13,.34],[.15,1.2],[.36,1.58],[.07,1.5],[-.12,1.24]];
 add(sword,shape(bladePoints,.065,.025),'cream');add(sword,shape([[-.075,.38],[.095,.38],[.10,1.19],[.22,1.43],[.05,1.35],[-.075,1.19]],.012,.007),'cloth',[0,0,.055],[1,1,1],false);add(sword,shape([[-.075,.38],[.095,.38],[.10,1.19],[.22,1.43],[.05,1.35],[-.075,1.19]],.012,.007),'cloth',[0,0,-.055],[1,1,1],false);
 const bladeTip=new T.Object3D();bladeTip.position.set(.25,1.48,0);sword.add(bladeTip);parts.bladeTip=bladeTip;
 // Large expressive face. Eye patches and muzzle remain smooth geometry at every angle.
 const head=group(body,[0,2.95,.04]);parts.head=head;
 ball(head,'brown',[0,0,0],[.97,.78,.75]);ball(head,'cream',[0,-.13,.55],[.79,.59,.30]);
 for(const side of [-1,1]){const patch=ball(head,'brown',[side*.38,-.08,.79],[.29,.30,.095],false);patch.rotation.z=side*-.2;ball(head,'ink',[side*.28,-.085,.892],[.073,.135,.048],false);ball(head,'cream',[side*.30,-.035,.93],[.018,.027,.012],false);
  const brow=add(head,shape([[-.16,.025],[.15,-.02],[.13,-.085],[-.13,-.065]],.02,.018),'brown',[side*.31,.21,.84],[1,1,1],false);brow.rotation.z=side*-.15;
 }
 ball(head,'cream',[0,-.36,.86],[.39,.25,.18],false);ball(head,'ink',[0,-.25,1.025],[.12,.075,.05],false);
 line(head,[[0,-.30,1.035],[0,-.37,1.045],[-.09,-.41,1.025],[-.16,-.38,.999]],'ink',.014);line(head,[[0,-.37,1.045],[.09,-.41,1.025],[.16,-.38,.999]],'ink',.014);
 // Helmet dome, rounded ears, flared neck plates and a contrasting brim.
 add(head,new T.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI/2),'red',[0,.16,0],[1.05,.88,.88]);
 for(const side of [-1,1]){
  const ear=group(head,[side*.76,.59,-.02]);ear.rotation.z=side*-.24;parts[side<0?'earR':'earL']=ear;
  add(ear,earGeometry(),'brown');
  add(ear,earGeometry(true),'pink',[0,.1,.17],[1,1,1],false);
  const flap=add(head,shape([[-.27,.2],[.24,.23],[.43,-.35],[-.26,-.31]],.16,.055),'red',[side*.83,-.25,-.06]);flap.rotation.y=side*.7;flap.rotation.z=side*-.18;
  line(flap,[[-.2,-.14,.11],[.03,-.14,.11],[.31,-.14,.11]],'deep',.021);
 }
 // Brim wraps across the face, with a thick ivory edge.
 const brim=new T.Shape();brim.moveTo(-1.02,-.06);brim.quadraticCurveTo(0,.23,1.02,-.06);brim.lineTo(.98,.14);brim.quadraticCurveTo(0,.43,-.98,.14);brim.closePath();
 add(head,new T.ExtrudeGeometry(brim,{depth:.15,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3,steps:1}),'cream',[0,.13,.79]);
 line(head,[[-.93,.37,.70],[-.5,.53,.76],[0,.57,.79],[.5,.53,.76],[.93,.37,.70]],'deep',.022);
 line(head,[[-.59,.86,.36],[-.45,.93,.53],[-.3,.84,.72]],'deep',.012);line(head,[[.59,.86,.36],[.45,.93,.53],[.3,.84,.72]],'deep',.012);
 disc(head,'gold',[0,.69,.83],.25,.08);disc(head,'cream',[0,.69,.882],.20,.018,false);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const bean=ball(head,'brown',[Math.sin(a)*.09,.69+Math.cos(a)*.09,.906],[.065,.09,.013],false);bean.rotation.z=-a+.4;}
 // Scarf covers the neck joint; two articulated ribbon tails trail behind.
 const collar=add(body,new T.TorusGeometry(.60,.19,16,64),'red',[0,2.42,.02],[1.15,1,.82]);collar.rotation.x=Math.PI/2;
 ball(body,'red',[0,2.37,.38],[.79,.22,.32]);line(body,[[-.6,2.32,.57],[-.1,2.27,.70],[.43,2.34,.64]],'deep',.021);
 for(let i=0;i<2;i++){const ribbon=group(body,[-.52,2.42,-.43]);parts['ribbon'+i]=ribbon;ribbon.rotation.y=i?-.32:.12;ribbon.rotation.x=i?.12:-.08;
  add(ribbon,shape([[0,.11],[-.55,.30],[-1.23,.38],[-1.62,.15],[-1.25,.08],[-1.42,-.19],[-.68,-.10],[0,-.15]],.055,.035),'red',[0,0,-i*.13]);line(ribbon,[[-.12,0,.055],[-.7,.05,.055],[-1.16,.18,.055]],'deep',.016);
 }
 const knot=group(body,[.59,2.31,.62]);for(let i=0;i<4;i++){const a=i*Math.PI/2,m=ball(knot,'gold',[Math.sin(a)*.15,Math.cos(a)*.15,0],[.105,.15,.065]);m.rotation.z=-a;}ball(knot,'gold',[0,0,.07],[.105,.105,.06]);
 let time=0,slashTime=-1;
 function update(dt,{run=0,strike=false}={}){
  time+=dt;if(strike&&slashTime<0)slashTime=0;if(slashTime>=0){slashTime+=dt;if(slashTime>1.05)slashTime=-1;}
  const gait=time*10,bob=Math.sin(time*2.3)*.025;body.position.y=bob+Math.abs(Math.sin(gait))*run*.07;body.rotation.x=run*.10;body.rotation.y=0;
  parts.head.rotation.set(Math.sin(time*1.8)*.025,Math.sin(time*.8)*.055,Math.sin(time*1.4)*.018);
  for(const side of [-1,1]){const suffix=side<0?'R':'L',phase=gait+(side<0?0:Math.PI);parts['leg'+suffix].rotation.x=Math.sin(phase)*.65*run;parts['knee'+suffix].rotation.x=Math.max(0,-Math.sin(phase))*.62*run;parts['arm'+suffix].rotation.set(-Math.sin(phase)*.5*run,0,side*(.22+run*.05));parts['elbow'+suffix].rotation.x=-.12-run*.2;}
  parts.tail.rotation.y=Math.sin(time*2.5)*(.12+run*.14);parts.tail.rotation.x=Math.sin(gait)*run*.08;parts.ribbon0.rotation.y=.12+Math.sin(time*4)*.12+run*.25;parts.ribbon1.rotation.y=-.32+Math.sin(time*4-1)*.14+run*.3;parts.ribbon0.rotation.z=run*-.18;parts.ribbon1.rotation.z=run*-.25;
  parts.sword.rotation.set(0,-.15,2.55);
  if(slashTime>=0){const t=slashTime;let swing;if(t<.26)swing=T.MathUtils.smoothstep(t,0,.26);else if(t<.49)swing=1-T.MathUtils.smoothstep(t,.26,.49)*2;else swing=-1+T.MathUtils.smoothstep(t,.49,1.05);body.rotation.y=-swing*.62;parts.armR.rotation.set(-.65-Math.max(0,swing)*.6,-swing*1.1,-.25-swing*.85);parts.elbowR.rotation.x=-.6;parts.sword.rotation.z=1.45;parts.head.rotation.y=swing*.18;parts.armL.rotation.x=.45;body.position.y-=Math.sin(Math.min(1,t/.8)*Math.PI)*.12;}
  root.updateMatrixWorld(true);return {striking:slashTime>=0,slash:slashTime,tip:parts.bladeTip.getWorldPosition(new T.Vector3()),hand:parts.handR.getWorldPosition(new T.Vector3())};
 }
 function setOutline(pixels){edgeMat.uniforms.thickness.value=pixels;for(const o of outlines)o.visible=pixels>0;}
 return {root,parts,update,setOutline,resize:(w,h)=>edgeMat.uniforms.resolution.value.set(w,h),materials,gradient,edgeMat};
}
