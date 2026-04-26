/* ============================================================
   app.js — Controlador Principal: Navegación + Lógica de Páginas
   ============================================================ */

'use strict';

// ── STARFIELD ────────────────────────────────────────────────
(function(){
  const c=document.getElementById('starfield');
  if(!c) return;
  const ctx=c.getContext('2d');
  function resize(){ c.width=window.innerWidth; c.height=window.innerHeight; }
  resize();
  window.addEventListener('resize',resize);
  const stars=Array.from({length:220},()=>({
    x:Math.random()*window.innerWidth,
    y:Math.random()*window.innerHeight,
    r:Math.random()*1.4+0.2,
    o:Math.random()*0.6+0.1,
    d:Math.random()*4000+1500
  }));
  function draw(){
    ctx.clearRect(0,0,c.width,c.height);
    const bg=ctx.createRadialGradient(c.width*0.25,c.height*0.5,0,c.width*0.5,c.height*0.5,c.width);
    bg.addColorStop(0,'#051220'); bg.addColorStop(1,'#020b18');
    ctx.fillStyle=bg; ctx.fillRect(0,0,c.width,c.height);
    stars.forEach(s=>{
      const op=s.o*(0.5+0.5*Math.sin(Date.now()/s.d));
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(180,220,255,${op})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── NAVIGATION ───────────────────────────────────────────────
function navigateTo(pageId){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a=>a.classList.remove('active'));
  const page=document.getElementById('page-'+pageId);
  if(page) page.classList.add('active');
  const link=document.querySelector(`.nav-links a[data-page="${pageId}"]`);
  if(link) link.classList.add('active');
  AppState.currentPage=pageId;
  window.scrollTo({top:0,behavior:'smooth'});
  // Initialize page-specific content
  if(pageId==='solver') initSolverPage();
  if(pageId==='graficos') initGraficosPage();
  if(pageId==='analisis') initAnalisisPage();
  if(pageId==='algoritmos') initAlgoritmosPage();
}

document.querySelectorAll('.nav-links a').forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();
    navigateTo(a.dataset.page);
  });
});

// ── PAGE: HOME ───────────────────────────────────────────────
// (static, no init needed)

// ── PAGE: SOLVER ─────────────────────────────────────────────
let solverInited=false;

function initSolverPage(){
  if(!solverInited){
    setScenario(0);
    solverInited=true;
  }
}

function setScenario(idx){
  AppState.currentScenario=idx;
  const s=SCENARIOS[idx];
  document.querySelectorAll('.tab-btn').forEach((b,i)=>b.classList.toggle('active',i===idx));
  document.getElementById('scenario-desc').innerHTML=s.desc;
  UI.renderMatrix(s.A, s.b, 'matrix-container');
  // Reset displays
  ['ex1','ex2','ex3'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.textContent='—';el.closest('.sol-box')?.classList.remove('updated');}
  });
  document.getElementById('interp-text').textContent='Presiona RESOLVER para ver la interpretación.';
  document.getElementById('methods-output').innerHTML=`
    <div style="text-align:center;padding:40px;color:var(--text-dim);font-family:var(--mono);font-size:12px;">
      ▷ Presiona RESOLVER TODOS LOS MÉTODOS para ver los resultados<br>individuales de cada algoritmo con sus iteraciones y convergencia
    </div>`;
  const lu=document.getElementById('lu-output');
  if(lu) lu.innerHTML='';
  updateLiveKappa();
  document.getElementById('log-main').innerHTML=`<span class="log-info">› Escenario ${idx+1} cargado: ${s.name}</span>`;
  // Add live kappa on input
  document.addEventListener('input',e=>{
    if(e.target.classList.contains('matrix-cell')) updateLiveKappa();
  },{once:false});
}

function updateLiveKappa(){
  try{
    const {A}=UI.getMatrix();
    const k=MathEngine.condNumber(A);
    UI.updateKappa(k,'kappa-val','kappa-badge');
  }catch(e){}
}

function resetScenario(){ setScenario(AppState.currentScenario); }

function updateOmega(){
  AppState.sorOmega=parseFloat(document.getElementById('sor-omega').value);
  document.getElementById('sor-omega-val').textContent=AppState.sorOmega.toFixed(2);
}

function solveAll(){
  const {A,b}=UI.getMatrix();
  const tol=1e-6;
  const omega=AppState.sorOmega;
  const log=[];
  const addLog=(msg,cls='')=>log.push({msg:`› ${msg}`,cls});

  addLog(`Iniciando resolución — Escenario ${AppState.currentScenario+1}`, 'log-info');
  addLog(`Tolerancia: 10⁻⁶  ·  ω(SOR): ${omega.toFixed(2)}  ·  GCP Precond: M=diag(A)⁻¹`);

  // Run all solvers
  const luR  = MathEngine.solveLU(A.map(r=>[...r]),[...b]);
  const jR   = MathEngine.solveJacobi(A,[...b],tol);
  const gsR  = MathEngine.solveGS(A,[...b],tol);
  const sorR = MathEngine.solveSOR(A,[...b],omega,tol);
  const gcpR = MathEngine.solveGCP(A,[...b],tol);

  if(!luR.sol){
    addLog('ERROR: Matriz singular o mal definida','log-err');
    UI.log('log-main',log); return;
  }

  addLog(`LU: Solución exacta [${luR.sol.map(v=>v.toFixed(5)).join(', ')}] W`,'log-ok');
  addLog(jR.conv?`Jacobi: convergió en ${jR.iters} iter · err=${jR.finalErr.toExponential(2)}`:`Jacobi: NO convergió (${jR.iters} iter)`,(jR.conv?'log-ok':'log-err'));
  addLog(gsR.conv?`Gauss-Seidel: ${gsR.iters} iter · err=${gsR.finalErr.toExponential(2)}`:`G-S: NO convergió`,(gsR.conv?'log-ok':'log-err'));
  addLog(sorR.conv?`SOR(ω=${omega.toFixed(2)}): ${sorR.iters} iter · err=${sorR.finalErr.toExponential(2)}`:`SOR: NO convergió`,(sorR.conv?'log-ok':'log-warn'));
  addLog(gcpR.conv?`GCP (Suñagua): ${gcpR.iters} iter · err=${gcpR.finalErr.toExponential(2)}`:`GCP: ${gcpR.iters} iter · err=${gcpR.finalErr?.toExponential(2)}`,(gcpR.conv?'log-ok':'log-warn'));
  addLog('━━━ Resolución completada ━━━','log-info');

  UI.log('log-main',log);

  // Update exact solution boxes
  UI.updateSolutionBoxes(luR.sol,'ex');
  document.getElementById('interp-text').innerHTML=SCENARIOS[AppState.currentScenario].interpFn(luR.sol);

  // LU display
  const luOut=document.getElementById('lu-output');
  if(luOut){
    luOut.innerHTML=UI.renderMethodPanel(luR,{id:'lu',name:'Factorización LU (Referencia Exacta)',color:'var(--accent)',colorHex:'#00d4ff'});
  }

  // Individual method panels
  const methodsOut=document.getElementById('methods-output');
  const defs=[
    {key:'jacobi',r:jR, id:'jacobi', name:'Método de Jacobi',            colorHex:'#00d4ff'},
    {key:'gs',    r:gsR,id:'gs',     name:'Método de Gauss-Seidel',       colorHex:'#00ff9d'},
    {key:'sor',   r:sorR,id:'sor',   name:`Método SOR (ω=${omega.toFixed(2)})`, colorHex:'#ff6b35'},
    {key:'gcp',   r:gcpR,id:'gcp',  name:'Grad. Conjugado Precond. (Suñagua 2020)', colorHex:'#c77dff'},
  ];
  methodsOut.innerHTML=defs.map(d=>UI.renderMethodPanel(d.r,d)).join('');

  // Open first panel auto
  const firstPanel=document.getElementById('panel-jacobi');
  if(firstPanel){firstPanel.classList.add('open'); const arr=document.getElementById('arrow-jacobi'); if(arr)arr.textContent='▲';}

  // Store results
  AppState.results[AppState.currentScenario]={
    jacobi:jR, gs:gsR, sor:sorR, gcp:gcpR, lu:luR
  };
}

// ── PAGE: GRÁFICOS ───────────────────────────────────────────
let graficosInited=false;
let grafScenario=0;
let grafMethod='jacobi';

function initGraficosPage(){
  // Pre-compute all scenarios silently
  for(let idx=0;idx<3;idx++){
    if(!AppState.results[idx]) _silentSolve(idx);
  }
  if(!graficosInited){
    graficosInited=true;
    setGrafScenario(0);
  }
}

function _silentSolve(idx){
  const s=SCENARIOS[idx];
  const A=s.A.map(r=>[...r]), b=[...s.b], tol=1e-6, omega=AppState.sorOmega;
  AppState.results[idx]={
    jacobi: MathEngine.solveJacobi(A,[...b],tol),
    gs:     MathEngine.solveGS(A,[...b],tol),
    sor:    MathEngine.solveSOR(A,[...b],omega,tol),
    gcp:    MathEngine.solveGCP(A,[...b],tol),
    lu:     MathEngine.solveLU(A.map(r=>[...r]),[...b])
  };
}

function setGrafScenario(idx){
  grafScenario=idx;
  document.querySelectorAll('.graf-tab').forEach((b,i)=>b.classList.toggle('active',i===idx));
  if(!AppState.results[idx]) _silentSolve(idx);
  renderGraficos();
}

function setGrafMethod(method){
  grafMethod=method;
  document.querySelectorAll('.meth-tab').forEach(b=>b.classList.toggle('active',b.dataset.method===method));
  renderSingleMethodChart();
}

function renderGraficos(){
  const res=AppState.results[grafScenario];
  if(!res) return;
  // Per-method charts
  const methods=[
    {key:'jacobi',id:'chart-j',  color:'#00d4ff',label:'Jacobi'},
    {key:'gs',    id:'chart-gs', color:'#00ff9d',label:'Gauss-Seidel'},
    {key:'sor',   id:'chart-sor',color:'#ff6b35',label:`SOR ω=${AppState.sorOmega.toFixed(2)}`},
    {key:'gcp',   id:'chart-gcp',color:'#c77dff',label:'GCP (Suñagua)'},
  ];
  methods.forEach(m=>{
    const r=res[m.key];
    Charts.renderSingle(m.id, r?.history||[], m.color, m.label, r?.conv||false);
    // Update iter/conv badge
    const badge=document.getElementById(`badge-${m.key}`);
    const iterEl=document.getElementById(`iter-${m.key}`);
    if(badge) badge.innerHTML=UI.convBadge(r?.conv);
    if(iterEl) iterEl.textContent=r?.iters||'—';
  });
  // Comparison chart
  Charts.renderAll('chart-all', res);
}

function renderSingleMethodChart(){
  // Not used separately now - kept for future
}

// ── PAGE: ANÁLISIS ───────────────────────────────────────────
function initAnalisisPage(){
  for(let idx=0;idx<3;idx++){
    if(!AppState.results[idx]) _silentSolve(idx);
  }
  // Render compare table
  renderCompareTable();
  // Render iter + error bar charts
  const allRes=AppState.results;
  Charts.renderIterBar('chart-iters-bar', allRes);
  Charts.renderErrBar('chart-err-bar', allRes);
  // Render 3D for each scenario button (default sc0)
  render3DForScenario(0);
  // Update analysis text
  renderAnalysisText();
}

function render3DForScenario(idx){
  document.querySelectorAll('.sc3d-tab').forEach((b,i)=>b.classList.toggle('active',i===idx));
  const s=SCENARIOS[idx];
  const res=AppState.results[idx];
  ThreePlanes.init('three-canvas');
  ThreePlanes.render(s.A, s.b, res?.lu?.sol||null);
}

function renderCompareTable(){
  const methods=[
    {key:'jacobi',name:'Jacobi'},
    {key:'gs',    name:'Gauss-Seidel'},
    {key:'sor',   name:`SOR (ω=${AppState.sorOmega.toFixed(2)})`},
    {key:'gcp',   name:'Grad. Conj. Prec. (Suñagua)'},
    {key:'lu',    name:'Factorización LU'},
  ];
  let html='';
  methods.forEach(m=>{
    const d=[0,1,2].map(i=>AppState.results[i]?.[m.key]);
    const iterCell=(r,i)=>{
      if(!r) return '—';
      if(m.key==='lu') return '<span class="badge badge-ref">DIRECTO</span>';
      const best=Math.min(...[0,1,2].filter(j=>AppState.results[j]?.[m.key]?.conv).map(j=>AppState.results[j][m.key].iters));
      const isBest=r.conv&&r.iters===best;
      return `<span class="${isBest?'best-cell':''}">${r.iters}</span>`;
    };
    const colByIdx=[d[0]?.conv,d[1]?.conv,d[2]?.conv];
    const mColors={jacobi:'var(--accent)',gs:'var(--accent2)',sor:'var(--accent3)',gcp:'var(--accent4)',lu:'var(--text-dim)'};
    html+=`<tr>
      <td style="color:${mColors[m.key]};font-weight:600;font-family:var(--mono);">${m.name}</td>
      ${[0,1,2].map(i=>`<td>${iterCell(d[i],i)}</td>`).join('')}
      ${[0,1,2].map(i=>`<td>${UI.convBadge(d[i]?.conv)}</td>`).join('')}
      <td style="font-family:var(--mono);font-size:10px;color:var(--accent3);">${d[2]?.finalErr?.toExponential(2)||'—'}</td>
    </tr>`;
  });
  document.getElementById('compare-tbody').innerHTML=html;
}

function renderAnalysisText(){
  const k=[0,1,2].map(i=>MathEngine.condNumber(SCENARIOS[i].A));
  const res=AppState.results;
  const jc0=res[0]?.jacobi, jc1=res[1]?.jacobi, jc2=res[2]?.jacobi;
  const gc=res[2]?.gcp;
  const html=`
    <strong style="color:var(--accent2)">Análisis del Número de Condición κ(A) por Escenario:</strong><br><br>
    <span style="color:var(--accent)">▶ Escenario 1 (Nominal):</span> κ(A) ≈ <code style="color:var(--accent)">${k[0].toExponential(3)}</code>.
    Matriz diagonalmente dominante estricta. Jacobi: <strong>${jc0?.iters||'—'}</strong> iter, G-S: <strong>${res[0]?.gs?.iters||'—'}</strong> iter,
    SOR: <strong>${res[0]?.sor?.iters||'—'}</strong> iter, GCP: <strong>${res[0]?.gcp?.iters||'—'}</strong> iter.
    El sistema está bien condicionado: pequeñas perturbaciones en <em>b</em> producen cambios proporcionales pequeños en <em>x</em>.<br><br>
    <span style="color:var(--warn)">▶ Escenario 2 (Estrés):</span> κ(A) ≈ <code style="color:var(--warn)">${k[1].toExponential(3)}</code>.
    Coeficientes más grandes pero estructura dominante conservada. Jacobi: <strong>${jc1?.iters||'—'}</strong> iter,
    SOR: <strong>${res[1]?.sor?.iters||'—'}</strong> iter. Los valores altos de <em>b</em> no afectan el condicionamiento de A —
    solo escalan la solución. SOR con ω>${AppState.sorOmega.toFixed(2)} supera a Gauss-Seidel puro en velocidad de convergencia.<br><br>
    <span style="color:var(--danger)">▶ Escenario 3 (Mal Condicionado):</span> κ(A) ≈ <code style="color:var(--danger)">${k[2].toExponential(3)}</code>.
    Dos filas de A casi idénticas → planos casi paralelos (visibles en el gráfico 3D) → convergencia muy lenta o divergencia
    para métodos clásicos. El <strong style="color:var(--accent4)">GCP (Suñagua Alg. 2)</strong> con precondicionador
    M=diag(A)⁻¹ reduce efectivamente κ y logra convergencia en <strong>${gc?.iters||'—'}</strong> iter con error
    ${gc?.finalErr?.toExponential(2)||'—'}.<br><br>
    <strong style="color:var(--accent2)">Conclusión de Ingeniería Satelital:</strong> En la sombra terrestre (Esc. 3),
    los métodos estándar son insuficientes para determinar la distribución óptima de potencia con precisión 10⁻⁶.
    El GCP precondicionado es la única alternativa que garantiza la solución en este escenario crítico,
    previniendo una falla catastrófica del bus eléctrico del satélite.
  `;
  const el=document.getElementById('analysis-text');
  if(el) el.innerHTML=html;
}

// ── PAGE: ALGORITMOS ─────────────────────────────────────────
function initAlgoritmosPage(){
  // Static page — nothing dynamic needed
}

// ── INIT ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded',()=>{
  navigateTo('home');
});