/* ============================================================
   math.js — Álgebra Lineal + Todos los Solvers
   Tolerancia: 1e-6 · Max iter: 10,000
   ============================================================ */

'use strict';

// ── VECTOR OPS ────────────────────────────────────────────────
const matMul    = (A, x) => A.map(row => row.reduce((s,a,j)=>s+a*x[j], 0));
const vecSub    = (a, b) => a.map((v,i)=>v-b[i]);
const vecAdd    = (a, b) => a.map((v,i)=>v+b[i]);
const vecScale  = (a, s) => a.map(v=>v*s);
const vecDot    = (a, b) => a.reduce((s,v,i)=>s+v*b[i], 0);
const vecNorm2  = a => Math.sqrt(vecDot(a,a));
const vecNormInf= a => Math.max(...a.map(Math.abs));
const vecCopy   = a => [...a];
const matCopy   = A => A.map(r=>[...r]);

// ── LU DECOMPOSITION (Doolittle + partial pivot) ─────────────
function luDecompose(A) {
  const n = A.length;
  const L = Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0));
  const U = matCopy(A);
  const piv = Array.from({length:n},(_,i)=>i);
  for(let k=0;k<n;k++){
    let maxVal=Math.abs(U[k][k]), maxRow=k;
    for(let i=k+1;i<n;i++) if(Math.abs(U[i][k])>maxVal){maxVal=Math.abs(U[i][k]);maxRow=i;}
    if(maxRow!==k){
      [U[k],U[maxRow]]=[U[maxRow],U[k]];
      [piv[k],piv[maxRow]]=[piv[maxRow],piv[k]];
      for(let j=0;j<k;j++) [L[k][j],L[maxRow][j]]=[L[maxRow][j],L[k][j]];
    }
    if(Math.abs(U[k][k])<1e-15) return null;
    for(let i=k+1;i<n;i++){
      L[i][k]=U[i][k]/U[k][k];
      for(let j=k;j<n;j++) U[i][j]-=L[i][k]*U[k][j];
    }
  }
  return {L,U,piv};
}

function luSolveSystem(L,U,piv,b){
  const n=b.length;
  const pb=piv.map(i=>b[i]);
  const y=Array(n).fill(0);
  for(let i=0;i<n;i++){
    y[i]=pb[i];
    for(let j=0;j<i;j++) y[i]-=L[i][j]*y[j];
  }
  const x=Array(n).fill(0);
  for(let i=n-1;i>=0;i--){
    x[i]=y[i];
    for(let j=i+1;j<n;j++) x[i]-=U[i][j]*x[j];
    x[i]/=U[i][i];
  }
  return x;
}

// ── CONDITION NUMBER estimate (via LU inverse) ───────────────
function condNumber(A){
  try{
    const lu=luDecompose(matCopy(A));
    if(!lu) return Infinity;
    const n=A.length;
    const normA=Math.max(...A.map(row=>row.reduce((s,v)=>s+Math.abs(v),0)));
    let invNorm=0;
    for(let j=0;j<n;j++){
      const ej=Array(n).fill(0); ej[j]=1;
      const col=luSolveSystem(lu.L,lu.U,lu.piv,ej);
      invNorm=Math.max(invNorm,col.reduce((s,v)=>s+Math.abs(v),0));
    }
    return normA*invNorm;
  }catch(e){return Infinity;}
}

// ── SOLVER: LU ───────────────────────────────────────────────
function solveLU(A,b){
  const t0=performance.now();
  const lu=luDecompose(matCopy(A));
  if(!lu) return {sol:null,iters:1,conv:false,steps:[],time:0,error:'Singular'};
  const sol=luSolveSystem(lu.L,lu.U,lu.piv,[...b]);
  const res=vecNorm2(vecSub(b,matMul(A,sol)));
  const steps=[
    {iter:'Factorización',x:sol,err:res,note:'Doolittle + pivoteo parcial'},
    {iter:'Sustitución',x:sol,err:res,note:'Adelante (L) + atrás (U)'},
  ];
  return {sol,iters:1,conv:true,steps,time:performance.now()-t0,finalErr:res,history:[]};
}

// ── SOLVER: JACOBI ───────────────────────────────────────────
function solveJacobi(A,b,tol=1e-6,maxIter=10000){
  const n=A.length, t0=performance.now();
  let x=Array(n).fill(0);
  const history=[], steps=[];
  for(let k=0;k<maxIter;k++){
    const xNew=Array(n).fill(0);
    for(let i=0;i<n;i++){
      let s=0;
      for(let j=0;j<n;j++) if(j!==i) s+=A[i][j]*x[j];
      if(Math.abs(A[i][i])<1e-15) return {sol:null,iters:k,conv:false,history,steps,time:performance.now()-t0};
      xNew[i]=(b[i]-s)/A[i][i];
    }
    const err=vecNormInf(vecSub(xNew,x));
    history.push(err);
    if(k<15 || k%Math.max(1,Math.floor(maxIter/20))===0 || err<tol)
      steps.push({iter:k+1,x:[...xNew],err});
    x=xNew;
    if(err<tol) return {sol:x,iters:k+1,conv:true,history,steps,time:performance.now()-t0,finalErr:err};
  }
  return {sol:x,iters:maxIter,conv:false,history,steps,time:performance.now()-t0,finalErr:history[history.length-1]};
}

// ── SOLVER: GAUSS-SEIDEL ─────────────────────────────────────
function solveGS(A,b,tol=1e-6,maxIter=10000){
  const n=A.length, t0=performance.now();
  let x=Array(n).fill(0);
  const history=[], steps=[];
  for(let k=0;k<maxIter;k++){
    const xOld=[...x];
    for(let i=0;i<n;i++){
      let s=0;
      for(let j=0;j<n;j++) if(j!==i) s+=A[i][j]*x[j];
      if(Math.abs(A[i][i])<1e-15) return {sol:null,iters:k,conv:false,history,steps,time:performance.now()-t0};
      x[i]=(b[i]-s)/A[i][i];
    }
    const err=vecNormInf(vecSub(x,xOld));
    history.push(err);
    if(k<15 || k%Math.max(1,Math.floor(maxIter/20))===0 || err<tol)
      steps.push({iter:k+1,x:[...x],err});
    if(err<tol) return {sol:[...x],iters:k+1,conv:true,history,steps,time:performance.now()-t0,finalErr:err};
  }
  return {sol:[...x],iters:maxIter,conv:false,history,steps,time:performance.now()-t0,finalErr:history[history.length-1]};
}

// ── SOLVER: SOR ──────────────────────────────────────────────
function solveSOR(A,b,omega=1.25,tol=1e-6,maxIter=10000){
  const n=A.length, t0=performance.now();
  let x=Array(n).fill(0);
  const history=[], steps=[];
  for(let k=0;k<maxIter;k++){
    const xOld=[...x];
    for(let i=0;i<n;i++){
      let s=0;
      for(let j=0;j<n;j++) if(j!==i) s+=A[i][j]*x[j];
      if(Math.abs(A[i][i])<1e-15) return {sol:null,iters:k,conv:false,history,steps,time:performance.now()-t0};
      const xGS=(b[i]-s)/A[i][i];
      x[i]=(1-omega)*x[i]+omega*xGS;
    }
    const err=vecNormInf(vecSub(x,xOld));
    history.push(err);
    if(k<15 || k%Math.max(1,Math.floor(maxIter/20))===0 || err<tol)
      steps.push({iter:k+1,x:[...x],err,omega});
    if(err<tol) return {sol:[...x],iters:k+1,conv:true,history,steps,time:performance.now()-t0,finalErr:err};
  }
  return {sol:[...x],iters:maxIter,conv:false,history,steps,time:performance.now()-t0,finalErr:history[history.length-1]};
}

// ── SOLVER: GRADIENTE CONJUGADO PRECONDICIONADO ───────────────
// Siguiendo exactamente Algoritmo 2 — Suñagua (2020)
// Precondicionador: M = diag(A)^{-1}
function solveGCP(A,b,tol=1e-6,maxIter=10000){
  const n=A.length, t0=performance.now();

  // Precondicionador diagonal: M = diag(A)^{-1}
  const Mdiag=A.map((row,i)=>{
    const d=Math.abs(row[i]);
    return d<1e-15?1.0:1.0/d;
  });
  const applyM=r=>r.map((v,i)=>v*Mdiag[i]);

  let x=Array(n).fill(0);
  let r=vecSub(b,matMul(A,x));          // r₀ = b − Ax₀
  let z=applyM(r);                       // Mz₀ = r₀
  let p=vecCopy(z);                      // p₁ = z₀
  let rz_old=vecDot(r,z);               // r₀ᵀz₀
  const history=[], steps=[];

  for(let k=0;k<maxIter;k++){
    const Ap=matMul(A,p);
    const pAp=vecDot(p,Ap);
    if(Math.abs(pAp)<1e-30) break;
    const alpha=rz_old/pAp;             // αₖ = rᵀz / pᵀAp
    x=vecAdd(x,vecScale(p,alpha));      // xₖ = xₖ₋₁ + αₖpₖ
    r=vecSub(r,vecScale(Ap,alpha));     // rₖ = rₖ₋₁ − αₖApₖ
    const err=vecNorm2(r);
    history.push(err);
    if(k<15 || k%Math.max(1,Math.floor(maxIter/20))===0 || err<tol)
      steps.push({iter:k+1,x:[...x],err,alpha,note:`α=${alpha.toExponential(3)}`});
    if(err<tol) return {sol:x,iters:k+1,conv:true,history,steps,time:performance.now()-t0,finalErr:err};
    z=applyM(r);                         // Mzₖ = rₖ
    const rz_new=vecDot(r,z);
    if(Math.abs(rz_old)<1e-30) break;
    const beta=rz_new/rz_old;           // βₖ = rₖᵀzₖ / rₖ₋₁ᵀzₖ₋₁
    p=vecAdd(z,vecScale(p,beta));        // pₖ₊₁ = zₖ + βₖpₖ
    rz_old=rz_new;
  }
  const finalErr=vecNorm2(vecSub(b,matMul(A,x)));
  return {sol:x,iters:history.length,conv:finalErr<tol*100,history,steps,time:performance.now()-t0,finalErr};
}

// ── EXPORT ───────────────────────────────────────────────────
window.MathEngine = {
  matMul,vecSub,vecAdd,vecScale,vecDot,vecNorm2,vecNormInf,vecCopy,matCopy,
  luDecompose,luSolveSystem,condNumber,
  solveLU,solveJacobi,solveGS,solveSOR,solveGCP
};