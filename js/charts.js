/* ============================================================
   charts.js — Gráficos individuales por método (Chart.js 4)
   ============================================================ */

'use strict';

const Charts = {
  instances: {},

  // ── CHART CONFIG BASE ────────────────────────────────────
  _baseOptions(title){
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#071627',
          borderColor: '#0d3a5c', borderWidth: 1,
          titleFont:{ family:"'Share Tech Mono'", size:10 },
          bodyFont:{ family:"'Share Tech Mono'", size:10 },
          callbacks:{
            label: ctx => `err: ${ctx.parsed.y.toExponential(3)}`
          }
        }
      },
      scales: {
        x:{
          type:'linear',
          title:{ display:true, text:'Iteración', color:'#4a7a9b', font:{family:"'Share Tech Mono'",size:10} },
          ticks:{ color:'#4a7a9b', font:{family:"'Share Tech Mono'",size:9}, maxTicksLimit:8 },
          grid:{ color:'rgba(13,58,92,0.4)' }
        },
        y:{
          type:'logarithmic',
          title:{ display:true, text:'Error (log)', color:'#4a7a9b', font:{family:"'Share Tech Mono'",size:10} },
          ticks:{ color:'#4a7a9b', font:{family:"'Share Tech Mono'",size:9}, callback:v=>v.toExponential(0) },
          grid:{ color:'rgba(13,58,92,0.4)' },
          min:1e-9
        }
      }
    };
  },

  // ── TOL LINE PLUGIN ──────────────────────────────────────
  _tolPlugin(){
    return {
      id:'tolLine',
      afterDraw(chart){
        const {ctx,scales:{y}}=chart;
        if(!y) return;
        const yPx=y.getPixelForValue(1e-6);
        if(isNaN(yPx)||yPx<chart.chartArea.top||yPx>chart.chartArea.bottom) return;
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5,4]);
        ctx.strokeStyle='rgba(255,183,0,0.75)';
        ctx.lineWidth=1.5;
        ctx.moveTo(chart.chartArea.left,yPx);
        ctx.lineTo(chart.chartArea.right,yPx);
        ctx.stroke();
        ctx.font="10px 'Share Tech Mono'";
        ctx.fillStyle='rgba(255,183,0,0.9)';
        ctx.fillText('tol=10⁻⁶',chart.chartArea.left+4,yPx-4);
        ctx.restore();
      }
    };
  },

  // ── SUBSAMPLE ────────────────────────────────────────────
  _subsample(arr, maxPts=100){
    if(!arr||arr.length===0) return [];
    const step=Math.max(1,Math.floor(arr.length/maxPts));
    const result=[];
    for(let i=0;i<arr.length;i+=step) result.push({x:i,y:Math.max(arr[i],1e-12)});
    return result;
  },

  // ── RENDER SINGLE METHOD CHART ───────────────────────────
  renderSingle(canvasId, history, color, label, conv){
    if(this.instances[canvasId]){
      this.instances[canvasId].destroy();
      delete this.instances[canvasId];
    }
    const canvas=document.getElementById(canvasId);
    if(!canvas||!history||history.length===0) return;

    const data=this._subsample(history,120);
    const opts=this._baseOptions(label);
    opts.plugins.legend.display=true;
    opts.plugins.legend.labels={ color:'#cce8ff', font:{family:"'Share Tech Mono'",size:11} };

    const chart=new Chart(canvas.getContext('2d'),{
      type:'line',
      data:{
        datasets:[{
          label:`${label} ${conv?'✓':'✗'}`,
          data,
          borderColor: color,
          backgroundColor: color+'22',
          fill: true,
          tension:0.35,
          pointRadius:0,
          borderWidth:2
        }]
      },
      options: opts,
      plugins:[ this._tolPlugin() ]
    });
    this.instances[canvasId]=chart;
  },

  // ── RENDER ALL METHODS (comparison) ─────────────────────
  renderAll(canvasId, results){
    if(this.instances[canvasId]){
      this.instances[canvasId].destroy();
      delete this.instances[canvasId];
    }
    const canvas=document.getElementById(canvasId);
    if(!canvas) return;

    const methods=[
      {key:'jacobi', label:'Jacobi',         color:'#00d4ff'},
      {key:'gs',     label:'Gauss-Seidel',   color:'#00ff9d'},
      {key:'sor',    label:`SOR ω=${AppState.sorOmega.toFixed(2)}`, color:'#ff6b35'},
      {key:'gcp',    label:'GCP (Suñagua)',  color:'#c77dff'},
    ];

    const datasets=methods
      .filter(m=>results[m.key]?.history?.length>0)
      .map(m=>({
        label:`${m.label} (${results[m.key].iters} iter)`,
        data:this._subsample(results[m.key].history,100),
        borderColor:m.color,
        backgroundColor:'transparent',
        tension:0.3,
        pointRadius:0,
        borderWidth:1.8
      }));

    if(datasets.length===0) return;
    const opts=this._baseOptions('Comparativo');
    opts.plugins.legend.display=true;
    opts.plugins.legend.labels={ color:'#cce8ff', font:{family:"'Share Tech Mono'",size:10}, boxWidth:16 };

    const chart=new Chart(canvas.getContext('2d'),{
      type:'line',
      data:{ datasets },
      options:opts,
      plugins:[ this._tolPlugin() ]
    });
    this.instances[canvasId]=chart;
  },

  // ── RENDER ITERATIONS BAR CHART ─────────────────────────
  renderIterBar(canvasId, allScenarioResults){
    if(this.instances[canvasId]){
      this.instances[canvasId].destroy();
      delete this.instances[canvasId];
    }
    const canvas=document.getElementById(canvasId);
    if(!canvas) return;

    const methods=['jacobi','gs','sor','gcp'];
    const mLabels=['Jacobi','Gauss-Seidel','SOR','GCP'];
    const sColors=['#00d4ff','#ffb700','#ff3864'];
    const sLabels=['Esc.1 Nominal','Esc.2 Estrés','Esc.3 Mal Cond.'];

    const datasets=sLabels.map((sl,si)=>({
      label:sl,
      data:methods.map(m=>{
        const r=allScenarioResults[si]?.[m];
        return r?.iters||0;
      }),
      backgroundColor:sColors[si]+'99',
      borderColor:sColors[si],
      borderWidth:1,
      borderRadius:3
    }));

    const chart=new Chart(canvas.getContext('2d'),{
      type:'bar',
      data:{ labels:mLabels, datasets },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        animation:{duration:600},
        plugins:{
          legend:{
            labels:{color:'#cce8ff',font:{family:"'Share Tech Mono'",size:10},boxWidth:14}
          },
          tooltip:{
            backgroundColor:'#071627',borderColor:'#0d3a5c',borderWidth:1,
            titleFont:{family:"'Share Tech Mono'",size:10},
            bodyFont:{family:"'Share Tech Mono'",size:10}
          }
        },
        scales:{
          x:{ticks:{color:'#4a7a9b',font:{family:"'Share Tech Mono'",size:10}},grid:{color:'rgba(13,58,92,0.4)'}},
          y:{
            title:{display:true,text:'Iteraciones',color:'#4a7a9b',font:{family:"'Share Tech Mono'",size:10}},
            ticks:{color:'#4a7a9b',font:{family:"'Share Tech Mono'",size:10}},
            grid:{color:'rgba(13,58,92,0.4)'},
            beginAtZero:true
          }
        }
      }
    });
    this.instances[canvasId]=chart;
  },

  // ── RENDER ERROR BAR CHART ───────────────────────────────
  renderErrBar(canvasId, allScenarioResults){
    if(this.instances[canvasId]){
      this.instances[canvasId].destroy();
      delete this.instances[canvasId];
    }
    const canvas=document.getElementById(canvasId);
    if(!canvas) return;

    const methods=['jacobi','gs','sor','gcp'];
    const mLabels=['Jacobi','Gauss-Seidel','SOR','GCP'];
    const sColors=['#00d4ff','#ffb700','#ff3864'];
    const sLabels=['Esc.1 Nominal','Esc.2 Estrés','Esc.3 Mal Cond.'];

    const datasets=sLabels.map((sl,si)=>({
      label:sl,
      data:methods.map(m=>{
        const r=allScenarioResults[si]?.[m];
        const e=r?.finalErr;
        return e?-Math.log10(Math.max(e,1e-15)):0;
      }),
      backgroundColor:sColors[si]+'99',
      borderColor:sColors[si],
      borderWidth:1,
      borderRadius:3
    }));

    const chart=new Chart(canvas.getContext('2d'),{
      type:'bar',
      data:{ labels:mLabels, datasets },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        animation:{duration:600},
        plugins:{
          legend:{labels:{color:'#cce8ff',font:{family:"'Share Tech Mono'",size:10},boxWidth:14}},
          tooltip:{
            backgroundColor:'#071627',borderColor:'#0d3a5c',borderWidth:1,
            titleFont:{family:"'Share Tech Mono'",size:10},
            bodyFont:{family:"'Share Tech Mono'",size:10},
            callbacks:{ label:ctx=>`-log₁₀(err) = ${ctx.parsed.y.toFixed(2)} (err≈10⁻${ctx.parsed.y.toFixed(1)})` }
          }
        },
        scales:{
          x:{ticks:{color:'#4a7a9b',font:{family:"'Share Tech Mono'",size:10}},grid:{color:'rgba(13,58,92,0.4)'}},
          y:{
            title:{display:true,text:'-log₁₀(error final)',color:'#4a7a9b',font:{family:"'Share Tech Mono'",size:10}},
            ticks:{color:'#4a7a9b',font:{family:"'Share Tech Mono'",size:10}},
            grid:{color:'rgba(13,58,92,0.4)'},
            beginAtZero:true
          }
        }
      }
    });
    this.instances[canvasId]=chart;
  }
};

window.Charts = Charts;