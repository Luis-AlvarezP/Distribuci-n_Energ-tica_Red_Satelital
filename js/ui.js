/* ============================================================
   ui.js — Helpers de Renderizado UI
   ============================================================ */

'use strict';

const UI = {

  // ── MATRIX EDITOR ────────────────────────────────────────
  renderMatrix(A, b, containerId) {
    const n = 3;
    let html = `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">`;
    // A matrix
    html += `<div><div class="matrix-bracket">[</div></div>`;
    html += `<div><div class="matrix-inner">`;
    for(let i=0;i<n;i++){
      html += `<div class="matrix-row">`;
      for(let j=0;j<n;j++){
        html += `<input class="matrix-cell" id="a${i}${j}" type="number" step="any" value="${A[i][j]}">`;
      }
      html += `</div>`;
    }
    html += `</div><div class="matrix-label">A (n×n)</div></div>`;
    html += `<div><div class="matrix-bracket">]</div></div>`;
    // dot
    html += `<div class="matrix-eq-sign">·</div>`;
    // x vector
    html += `<div><div class="matrix-bracket">[</div></div>`;
    html += `<div><div class="matrix-inner">`;
    const xNames = ['x₁','x₂','x₃'];
    for(let i=0;i<n;i++){
      html += `<div class="matrix-row"><input class="matrix-cell" id="xv${i}" type="text" value="${xNames[i]}" readonly></div>`;
    }
    html += `</div><div class="matrix-label">x</div></div>`;
    html += `<div><div class="matrix-bracket">]</div></div>`;
    // equals
    html += `<div class="matrix-eq-sign">=</div>`;
    // b vector
    html += `<div><div class="matrix-bracket">[</div></div>`;
    html += `<div><div class="matrix-inner">`;
    for(let i=0;i<n;i++){
      html += `<div class="matrix-row"><input class="matrix-cell" id="bv${i}" type="number" step="any" value="${b[i]}"></div>`;
    }
    html += `</div><div class="matrix-label">b</div></div>`;
    html += `<div><div class="matrix-bracket">]</div></div>`;
    html += `</div>`;
    document.getElementById(containerId).innerHTML = html;
  },

  // ── GET CURRENT MATRIX ───────────────────────────────────
  getMatrix() {
    const A=[], b=[];
    for(let i=0;i<3;i++){
      A.push([]);
      for(let j=0;j<3;j++){
        A[i].push(parseFloat(document.getElementById(`a${i}${j}`)?.value)||0);
      }
      b.push(parseFloat(document.getElementById(`bv${i}`)?.value)||0);
    }
    return {A,b};
  },

  // ── KAPPA DISPLAY ─────────────────────────────────────────
  updateKappa(k, elId='kappa-val', badgeId='kappa-badge') {
    const el = document.getElementById(elId);
    const badge = document.getElementById(badgeId);
    if(!el) return;
    if(!isFinite(k)||isNaN(k)){
      el.textContent='∞ (SINGULAR)'; el.className='kappa-bad';
      if(badge) badge.innerHTML='<span class="badge badge-no">SINGULAR</span>';
    } else if(k<100){
      el.textContent=k.toExponential(3); el.className='kappa-good';
      if(badge) badge.innerHTML='<span class="badge badge-yes">BIEN COND.</span>';
    } else if(k<1e6){
      el.textContent=k.toExponential(3); el.className='kappa-warn';
      if(badge) badge.innerHTML='<span class="badge badge-warn">MOD. COND.</span>';
    } else {
      el.textContent=k.toExponential(3); el.className='kappa-bad';
      if(badge) badge.innerHTML='<span class="badge badge-no">MAL COND.</span>';
    }
  },

  // ── SOLUTION BOXES ────────────────────────────────────────
  updateSolutionBoxes(sol, prefix='ex') {
    if(!sol) return;
    ['1','2','3'].forEach((n,i)=>{
      const el=document.getElementById(`${prefix}${n}`);
      if(el){ el.textContent=sol[i].toFixed(4)+' W'; el.closest('.sol-box')?.classList.add('updated'); }
    });
  },

  // ── METHOD RESULT PANEL ───────────────────────────────────
  renderMethodPanel(result, cfg) {
    const {id, name, color, colorHex} = cfg;
    const conv = result.conv;
    const convBadge = conv
      ? '<span class="badge badge-yes">CONVERGIÓ ✓</span>'
      : '<span class="badge badge-no">NO CONVERGIÓ ✗</span>';
    const itersStr = result.iters === 1 && id==='lu'
      ? '<span class="badge badge-ref">DIRECTO</span>'
      : `<span style="color:${colorHex};font-weight:bold;">${result.iters}</span>`;

    const stepsHtml = this._buildStepsLog(result.steps||[], id, result.sol);

    return `
    <div class="method-result-panel">
      <div class="method-result-header" onclick="UI.togglePanel('panel-${id}')">
        <div class="method-result-title" style="color:${colorHex}">
          ▶ ${name}
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${convBadge}
          <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim);">
            Iter: ${itersStr} · Err: <span style="color:var(--accent3);">${result.finalErr?.toExponential(2)||'—'}</span>
          </span>
          <span style="color:var(--text-dim);font-family:var(--mono);font-size:12px;" id="arrow-${id}">▼</span>
        </div>
      </div>
      <div class="method-result-body" id="panel-${id}">
        <div class="method-result-meta">
          <div class="meta-pill">Iteraciones: <span>${result.iters}</span></div>
          <div class="meta-pill">Error final: <span>${result.finalErr?.toExponential(3)||'0'}</span></div>
          <div class="meta-pill">Tiempo: <span>${result.time?.toFixed(2)||'—'} ms</span></div>
          <div class="meta-pill">Tol: <span>10⁻⁶</span></div>
          ${id==='sor'?`<div class="meta-pill">ω: <span>${AppState.sorOmega.toFixed(2)}</span></div>`:''}
          ${id==='gcp'?`<div class="meta-pill">Precond: <span>M=diag(A)⁻¹</span></div>`:''}
        </div>
        ${result.sol ? this._buildSolBoxes(result.sol, id) : '<p style="color:var(--danger);font-family:var(--mono);font-size:11px;">Sin solución válida</p>'}
        <div style="margin-top:12px;">
          <div class="step-log" id="steplog-${id}">${stepsHtml}</div>
        </div>
      </div>
    </div>`;
  },

  _buildSolBoxes(sol, id){
    const labels=[{l:'x₁',n:'RF/Láser'},{l:'x₂',n:'CPU'},{l:'x₃',n:'R.Wheels'}];
    let h=`<div class="solution-row">`;
    labels.forEach((lbl,i)=>{
      h+=`<div class="sol-box">
        <div class="sol-box-label">Solución ${lbl.l}</div>
        <div class="sol-box-var">${lbl.l}</div>
        <div class="sol-box-val">${sol[i].toFixed(5)}</div>
        <div class="sol-box-unit">Watts · (${lbl.n})</div>
      </div>`;
    });
    h+=`</div>`;
    return h;
  },

  _buildStepsLog(steps, id, sol){
    if(!steps||steps.length===0) return '<span class="sl-iter">Sin pasos registrados</span>';
    let h='';
    steps.forEach(s=>{
      const xStr = s.x ? s.x.map(v=>v.toFixed(5)).join(', ') : '—';
      const errStr = s.err !== undefined ? s.err.toExponential(3) : '—';
      if(id==='lu'){
        h+=`<span class="sl-iter">[${s.iter}] </span><span class="sl-val">x=[${xStr}]</span> <span style="color:var(--text-dim);">— ${s.note||''}</span><br>`;
      } else {
        const marker = s.err < 1e-6
          ? `<span class="sl-conv"> ✓ CONVERGIÓ</span>`
          : '';
        h+=`<span class="sl-iter">iter ${String(s.iter).padStart(4,' ')} │ </span><span class="sl-val">x=[${xStr}]</span> │ <span class="sl-err">err=${errStr}</span>${s.note?` │ <span style="color:var(--text-dim)">${s.note}</span>`:''}${marker}<br>`;
      }
    });
    if(sol){
      h+=`<span class="sl-conv">━━━ SOLUCIÓN FINAL: x=[${sol.map(v=>v.toFixed(6)).join(', ')}] ━━━</span>`;
    }
    return h;
  },

  // ── TOGGLE PANEL ─────────────────────────────────────────
  togglePanel(id){
    const el=document.getElementById(id);
    const arrow=document.getElementById('arrow-'+id.replace('panel-',''));
    if(!el) return;
    el.classList.toggle('open');
    if(arrow) arrow.textContent = el.classList.contains('open') ? '▲' : '▼';
  },

  // ── LOG ──────────────────────────────────────────────────
  log(containerId, entries){
    const el=document.getElementById(containerId);
    if(!el) return;
    el.innerHTML = entries.map(e=>`<span class="${e.cls||''}">${e.msg}</span>`).join('<br>');
    el.scrollTop=el.scrollHeight;
  },

  // ── BADGE CONV ───────────────────────────────────────────
  convBadge(conv){
    return conv
      ? '<span class="badge badge-yes">SÍ</span>'
      : '<span class="badge badge-no">NO</span>';
  }
};

window.UI = UI;