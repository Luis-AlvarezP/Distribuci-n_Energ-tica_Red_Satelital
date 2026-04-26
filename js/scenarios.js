/* ============================================================
   scenarios.js — Datos de los 3 Escenarios + Estado Global
   ============================================================ */

'use strict';

window.SCENARIOS = [
  {
    id: 0,
    name: "NOMINAL — Visibilidad Solar Total",
    shortName: "Nominal",
    color: "var(--accent2)",
    colorHex: "#00ff9d",
    icon: "🟢",
    A: [
      [10,  1,   0.5],
      [ 1,  12,  0.8],
      [ 0.5, 0.8, 9 ]
    ],
    b: [85, 92, 68],
    desc: `<strong style="color:var(--accent2)">Operación Nominal:</strong> El satélite tiene visibilidad solar plena. Los paneles generan ~150 W estables. El tráfico de datos es constante y bajo. Los tres subsistemas operan dentro de sus rangos nominales y no compiten por potencia. La matriz A es <em>diagonalmente dominante estricta</em> y bien condicionada: todos los métodos iterativos convergen rápida y establemente.`,
    interpFn: x => `En operación nominal el transmisor RF/Láser recibe <strong style="color:var(--accent)">${x[0].toFixed(3)} W</strong>, la CPU de enrutamiento <strong style="color:var(--accent2)">${x[1].toFixed(3)} W</strong> y los reaction wheels <strong style="color:var(--accent3)">${x[2].toFixed(3)} W</strong>. El balance térmico es óptimo: los paneles solares cubren exactamente la demanda con margen de seguridad. Todos los métodos convergen sin dificultad.`
  },
  {
    id: 1,
    name: "SOBRECARGA — Pico de Tráfico Extremo",
    shortName: "Estrés",
    color: "var(--warn)",
    colorHex: "#ffb700",
    icon: "🟡",
    A: [
      [25, 8,  3 ],
      [ 8, 30, 5 ],
      [ 3, 5,  18]
    ],
    b: [320, 410, 195],
    desc: `<strong style="color:var(--warn)">Bajo Estrés:</strong> Un evento masivo de cobertura satelital genera un pico masivo de usuarios. El transmisor RF (x₁) y la CPU (x₂) trabajan al límite térmico. Los coeficientes del vector <em>b</em> son muy grandes (>300 W). El SOR demostrará su ventaja al estabilizar la solución más rápido que GS antes de que el hardware sufra daño por sobrecalentamiento.`,
    interpFn: x => `En sobrecarga, el transmisor necesita <strong style="color:var(--accent)">${x[0].toFixed(3)} W</strong>, la CPU <strong style="color:var(--accent2)">${x[1].toFixed(3)} W</strong> y la estabilización <strong style="color:var(--accent3)">${x[2].toFixed(3)} W</strong>. La demanda supera los 400 W. El sistema térmico está al límite: otro 10% en b₂ activaría el mecanismo de load-shedding (apagado de subsistemas no críticos). SOR converge más rápido gracias a la sobrerelajación ω > 1.`
  },
  {
    id: 2,
    name: "SOMBRA TERRESTRE — Sistema Mal Condicionado",
    shortName: "Mal Cond.",
    color: "var(--danger)",
    colorHex: "#ff3864",
    icon: "🔴",
    A: [
      [10,    2,    1   ],
      [ 2,    8.01, 3.99],
      [ 2,    8.00, 4.01]
    ],
    b: [60, 55, 55.1],
    desc: `<strong style="color:var(--danger)">Mal Condicionado:</strong> El satélite entra en la umbra terrestre. Los sensores de corriente operan a −180 °C y su ruido electrónico hace que las lecturas de x₂ (CPU) y x₃ (Reaction Wheels) sean casi indistinguibles. Matemáticamente: dos filas de A son casi iguales → planos casi paralelos → κ(A) ≫ 1. Aquí el <strong>Gradiente Conjugado Precondicionado de Suñagua (2020)</strong> es esencial.`,
    interpFn: x => `En condición de sombra, la solución x₁=<strong style="color:var(--accent)">${x[0].toFixed(4)} W</strong>, x₂=<strong style="color:var(--accent2)">${x[1].toFixed(4)} W</strong>, x₃=<strong style="color:var(--accent3)">${x[2].toFixed(4)} W</strong> es extremadamente sensible al ruido de medición. Una perturbación de 0.1 W en b puede cambiar la solución en decenas de Watts. El GCP con precondicionador M=diag(A)⁻¹ recupera la solución con precisión numérica donde los métodos clásicos fallan.`
  }
];

// ── APP STATE ─────────────────────────────────────────────────
window.AppState = {
  currentScenario: 0,
  sorOmega: 1.25,
  results: {},          // keyed by scenario index
  currentPage: 'home',
};