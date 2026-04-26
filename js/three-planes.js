/* ============================================================
   three-planes.js — Visualización 3D de Planos (Three.js r128)
   ============================================================ */

'use strict';

const ThreePlanes = {
  renderer: null,
  camera: null,
  scene: null,
  animId: null,
  spherical: { theta: 0.7, phi: 1.1, r: 14 },
  isDragging: false,
  prevMouse: { x: 0, y: 0 },
  lastTouch: null,

  init(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (this.renderer) {
      if (this.animId) cancelAnimationFrame(this.animId);
      this.renderer.dispose();
    }
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x050f1f, 1);

    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 400;
    this.renderer.setSize(w, h, false);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 300);
    this._setupControls(canvas);
  },

  _setupControls(canvas) {
    canvas.addEventListener('mousedown', e => {
      this.isDragging = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('mousemove', e => {
      if (!this.isDragging) return;
      const dx = (e.clientX - this.prevMouse.x) * 0.012;
      const dy = (e.clientY - this.prevMouse.y) * 0.012;
      this.spherical.theta += dx;
      this.spherical.phi = Math.max(0.12, Math.min(Math.PI - 0.12, this.spherical.phi + dy));
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => this.isDragging = false);
    canvas.addEventListener('wheel', e => {
      this.spherical.r = Math.max(5, Math.min(35, this.spherical.r + e.deltaY * 0.025));
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchstart', e => {
      this.lastTouch = e.touches[0];
    });
    canvas.addEventListener('touchmove', e => {
      if (!this.lastTouch) return;
      const t = e.touches[0];
      const dx = (t.clientX - this.lastTouch.clientX) * 0.018;
      const dy = (t.clientY - this.lastTouch.clientY) * 0.018;
      this.spherical.theta += dx;
      this.spherical.phi = Math.max(0.12, Math.min(Math.PI - 0.12, this.spherical.phi + dy));
      this.lastTouch = t;
    });
    canvas.addEventListener('touchend', () => this.lastTouch = null);
  },

  render(A, b, sol) {
    if (!this.renderer) return;
    this.scene = new THREE.Scene();
    this._addAxes();
    this._addPlanes(A, b);
    if (sol) this._addSolutionPoint(sol);
    this._addLights();
    this._startAnimation();
  },

  _addAxes() {
    const len = 9;
    const colors = [0x1a5580, 0x1a7050, 0x6a3020];
    const dirs = [[len,0,0],[-len,0,0]];
    [[len,0,0],[0,len,0],[0,0,len]].forEach((d,i)=>{
      const pts=[new THREE.Vector3(-d[0],-d[1],-d[2]),new THREE.Vector3(...d)];
      const geo=new THREE.BufferGeometry().setFromPoints(pts);
      const mat=new THREE.LineBasicMaterial({color:colors[i],opacity:0.6,transparent:true});
      this.scene.add(new THREE.Line(geo,mat));
    });
    // Axis labels
    const labels=[['x₁',[len+0.8,0,0],'#00d4ff'],['x₂',[0,len+0.8,0],'#00ff9d'],['x₃',[0,0,len+0.8],'#ff6b35']];
    labels.forEach(([text,pos,col])=>{
      const c=document.createElement('canvas'); c.width=80; c.height=40;
      const ctx=c.getContext('2d');
      ctx.fillStyle=col; ctx.font='bold 28px monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(text,40,20);
      const tex=new THREE.CanvasTexture(c);
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
      sp.position.set(...pos); sp.scale.set(1.6,0.8,1);
      this.scene.add(sp);
    });
    // Tick marks
    const tickMat=new THREE.LineBasicMaterial({color:0x1a4060,opacity:0.4,transparent:true});
    for(let v=-8;v<=8;v+=2){
      if(v===0) continue;
      [[v,0,0],[0,v,0],[0,0,v]].forEach(pos=>{
        const size=0.15;
        const geo=new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(pos[0]-size,pos[1],pos[2]),
          new THREE.Vector3(pos[0]+size,pos[1],pos[2])
        ]);
        this.scene.add(new THREE.Line(geo,tickMat));
      });
    }
  },

  _addPlanes(A, b) {
    const planeColors = [0x0099dd, 0x00bb66, 0xcc3300];
    const N = 36;
    const range = 8;
    for(let eq=0;eq<3;eq++){
      const [a1,a2,a3]=A[eq];
      const bv=b[eq];
      const abs=[Math.abs(a1),Math.abs(a2),Math.abs(a3)];
      const dom=abs.indexOf(Math.max(...abs));
      const vertices=[];
      const step=(2*range)/(N-1);
      for(let iu=0;iu<N;iu++){
        for(let iv=0;iv<N;iv++){
          const u=-range+iu*step, v=-range+iv*step;
          let x1,x2,x3;
          if(dom===2&&Math.abs(a3)>1e-10){x1=u;x2=v;x3=(bv-a1*u-a2*v)/a3;}
          else if(dom===1&&Math.abs(a2)>1e-10){x1=u;x3=v;x2=(bv-a1*u-a3*v)/a2;}
          else if(Math.abs(a1)>1e-10){x2=u;x3=v;x1=(bv-a2*u-a3*v)/a1;}
          else{x1=u;x2=v;x3=0;}
          // Clamp for display
          const clamp=12;
          if(Math.abs(x1)>clamp||Math.abs(x2)>clamp||Math.abs(x3)>clamp){x1=0;x2=0;x3=0;}
          vertices.push(x1,x2,x3);
        }
      }
      const indices=[];
      for(let iu=0;iu<N-1;iu++){
        for(let iv=0;iv<N-1;iv++){
          const i0=iu*N+iv;
          indices.push(i0,i0+1,i0+N, i0+1,i0+N+1,i0+N);
        }
      }
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const mat=new THREE.MeshPhongMaterial({
        color:planeColors[eq],opacity:0.28,
        transparent:true,side:THREE.DoubleSide,shininess:20
      });
      this.scene.add(new THREE.Mesh(geo,mat));
      // Edge wireframe (sparse)
      const edgeMat=new THREE.LineBasicMaterial({color:planeColors[eq],opacity:0.22,transparent:true});
      const wgeo=new THREE.WireframeGeometry(geo);
      this.scene.add(new THREE.LineSegments(wgeo,edgeMat));
      // Plane label
      const lc=document.createElement('canvas'); lc.width=200; lc.height=48;
      const lctx=lc.getContext('2d');
      lctx.fillStyle=['#00d4ff','#00ff9d','#ff6b35'][eq];
      lctx.font='bold 20px monospace'; lctx.textAlign='center'; lctx.textBaseline='middle';
      lctx.fillText(`Plano ${eq+1}: ${a1.toFixed(1)}x₁+${a2.toFixed(1)}x₂+${a3.toFixed(1)}x₃=${bv}`,100,24);
      const ltex=new THREE.CanvasTexture(lc);
      const lsp=new THREE.Sprite(new THREE.SpriteMaterial({map:ltex,transparent:true}));
      const lpos=[[5,-7,0],[0,6,-5],[-6,0,5]][eq];
      lsp.position.set(...lpos); lsp.scale.set(4,0.96,1);
      this.scene.add(lsp);
    }
  },

  _addSolutionPoint(sol){
    // White sphere at solution
    const sgeo=new THREE.SphereGeometry(0.22,20,20);
    const smat=new THREE.MeshPhongMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:0.6,shininess:80});
    const smesh=new THREE.Mesh(sgeo,smat);
    smesh.position.set(...sol);
    this.scene.add(smesh);
    // Glow rings
    [0.5,0.8].forEach((r,i)=>{
      const rgeo=new THREE.TorusGeometry(r,0.04,8,32);
      const rmat=new THREE.MeshBasicMaterial({color:i===0?0x00d4ff:0x00ff9d,transparent:true,opacity:0.6});
      const rm=new THREE.Mesh(rgeo,rmat);
      rm.position.set(...sol);
      rm.rotation.x=Math.PI/2*i;
      this.scene.add(rm);
    });
    // Label
    const lc=document.createElement('canvas'); lc.width=260; lc.height=56;
    const lctx=lc.getContext('2d');
    lctx.fillStyle='#ffffff'; lctx.font='bold 16px monospace'; lctx.textAlign='center';
    lctx.fillText(`★ Solución`,130,18);
    lctx.fillStyle='#00ff9d'; lctx.font='13px monospace';
    lctx.fillText(`[${sol.map(v=>v.toFixed(2)).join(', ')}]`,130,40);
    const tex=new THREE.CanvasTexture(lc);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
    sp.position.set(sol[0],sol[1]+1.2,sol[2]);
    sp.scale.set(3.5,0.9,1);
    this.scene.add(sp);
  },

  _addLights(){
    this.scene.add(new THREE.AmbientLight(0x223355,1.0));
    const dl1=new THREE.DirectionalLight(0x00d4ff,0.5);
    dl1.position.set(8,12,6); this.scene.add(dl1);
    const dl2=new THREE.DirectionalLight(0x00ff9d,0.3);
    dl2.position.set(-6,-8,-4); this.scene.add(dl2);
  },

  _startAnimation(){
    if(this.animId) cancelAnimationFrame(this.animId);
    const loop=()=>{
      this.animId=requestAnimationFrame(loop);
      const {r,phi,theta}=this.spherical;
      const x=r*Math.sin(phi)*Math.sin(theta);
      const y=r*Math.cos(phi);
      const z=r*Math.sin(phi)*Math.cos(theta);
      this.camera.position.set(x,y,z);
      this.camera.lookAt(0,0,0);
      this.renderer.render(this.scene,this.camera);
    };
    loop();
  }
};

window.ThreePlanes = ThreePlanes;