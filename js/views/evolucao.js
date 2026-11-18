// Evolução: gráficos ao longo do tempo
import { views, actions, refresh } from "../core.js";
import { S } from "../store.js";
import { today, addDays, fmt, fmtShort, fmtDate, signed, daysBetween, $ } from "../util.js";
import { header, panel } from "../ui.js";
import { totals, spent, mealsOf, weightGoal, weightTrend } from "../game.js";
import { WEEKLY } from "./outros.js";
import { attendanceBoard } from "./assiduidade.js";

let period = 90, charts = [];
const PERIODS = [[30, "30 d"], [90, "90 d"], [180, "6 m"], [0, "Tudo"]];

function range() {
  const keys = Object.keys(S.days).sort();
  const first = keys[0] || today();
  const start = period ? addDays(today(), -period + 1) : first;
  const from = start < first ? first : start, out = [];
  for (let d = from; d <= today(); d = addDays(d, 1)) out.push(d);
  return out;
}

// Projeção: no ritmo das últimas 4 semanas, quando você entra na faixa da meta,
// e qual ritmo precisa para chegar em 1 ano desde o início.
function forecast(atual) {
  const goal = weightGoal(); if (!goal || !atual) return "";
  const tr = weightTrend(), inicio = S.profile.criado || Object.keys(S.days).sort()[0] || today();
  const prazo = addDays(inicio, 365), semanasRest = Math.max(1, daysBetween(today(), prazo) / 7);
  const ref = tr?.atual ?? atual;
  if (ref <= goal.teto) return panel("Projeção", `<p class="ok mid">Você está na faixa da meta.</p><p class="small muted">Agora é manter: ${fmt(goal.piso)}–${fmt(goal.teto)} kg.</p>`, "good");
  const linhas = [];
  const preciso = (ref - goal.teto) / semanasRest, precisoAlvo = (ref - goal.alvo) / semanasRest;
  linhas.push(`<li><span class="grow">Ritmo para chegar à faixa até ${fmtDate(prazo)} (1 ano)</span><b class="num">−${fmt(preciso, 2)} kg/sem</b></li>`);
  if (goal.margem) linhas.push(`<li><span class="grow">Para chegar a ${fmt(goal.alvo)} kg no mesmo prazo</span><b class="num">−${fmt(precisoAlvo, 2)} kg/sem</b></li>`);
  let msg;
  if (!tr) msg = `<p class="small muted">Registre o peso quase todo dia: com 6 pesagens em 10 dias ou mais, o Sistema calcula seu ritmo real e a data prevista.</p>`;
  else {
    linhas.unshift(`<li><span class="grow">Seu ritmo nas últimas 4 semanas</span><b class="num ${tr.porSemana < 0 ? "ok" : "bad"}">${signed(tr.porSemana, 2)} kg/sem</b></li>`);
    if (tr.porSemana >= -0.02) msg = `<p class="small warn">No ritmo atual você não chega à meta. Revise a meta de calorias.</p>`;
    else {
      const sem = (ref - goal.teto) / -tr.porSemana, data = addDays(today(), Math.round(sem * 7));
      const ok = data <= prazo;
      msg = `<p class="${ok ? "ok" : "warn"}">Nesse ritmo você entra na faixa em <b>${fmtDate(data, { month: "long", year: "numeric" })}</b>${ok ? ", dentro de 1 ano." : `, depois do prazo de 1 ano (${fmtDate(prazo, { month: "long", year: "numeric" })}).`}</p>`;
    }
  }
  return panel("Projeção", `<ul class="list small">${linhas.join("")}</ul>${msg}
    <p class="small muted">Ritmo saudável: 0,5% a 1% do peso por semana. Se ganhar músculo, a balança desce mais devagar: acompanhe também o abdômen.</p>`);
}

views.evolucao = () => {
  const days = Object.keys(S.days).filter(d => S.days[d].peso).sort();
  const p = S.profile, ini = p.pesoInicial, atual = days.length ? S.days[days[days.length - 1]].peso : ini;
  const abds = Object.keys(S.days).filter(d => S.days[d].abdomen).sort();
  const abdIni = abds.length ? S.days[abds[0]].abdomen : null, abdAt = abds.length ? S.days[abds[abds.length - 1]].abdomen : null;
  const row = (n, a, b, m, un) => `<tr><td>${n}</td><td class="num">${a ? fmt(a, 1) : "—"}</td><td class="num">${b ? fmt(b, 1) : "—"}</td>
    <td class="num ${a && b && b - a <= 0 ? "ok" : "warn"}">${a && b ? signed(b - a) : "—"}</td><td class="num">${m ? fmt(m, 1) : "—"} ${m ? un : ""}</td></tr>`;
  const box = id => `<div class="chartbox"><canvas id="${id}" role="img"></canvas></div>`;
  return `${header()}
    <div class="tabs">${PERIODS.map(([v, n]) => `<button class="btn sm ${period === v ? "on" : ""}" data-act="evoPeriod" data-v="${v}">${n}</button>`).join("")}</div>
    <div class="stack">
    ${panel("Resumo", `<table class="t"><tr><th></th><th>Início</th><th>Atual</th><th>Variação</th><th>Meta</th></tr>
      ${row("Peso", ini, atual, p.metaPeso, p.metaMargem ? `± ${fmt(p.metaMargem)} kg` : "kg")}${row("Abdômen", abdIni, abdAt, p.metaAbdomen, "cm")}</table>`)}
    ${attendanceBoard()}
    ${forecast(atual)}
    ${panel("Peso (kg)", box("c-peso"))}
    ${panel("Abdômen (cm)", box("c-abd"))}
    ${panel("Calorias: consumidas × gastas", box("c-kcal") + `<p class="small muted">Gasto = metabolismo de repouso × 1,2 + treino do dia (estimativa).</p>`)}
    ${panel("Medidas semanais (cm)", box("c-week"))}
    ${panel("Treinos por semana", box("c-treinos"))}</div>`;
};

actions.evoPeriod = ({ v }) => { period = +v; refresh(); };

function movingAvg(vals, n = 7) {
  return vals.map((_, i) => {
    const w = vals.slice(Math.max(0, i - n + 1), i + 1).filter(v => v != null);
    return w.length >= 3 ? +(w.reduce((a, b) => a + b, 0) / w.length).toFixed(2) : null;
  });
}

views.evolucao.after = () => {
  charts.forEach(c => c.destroy()); charts = [];
  const css = getComputedStyle(document.body), v = n => css.getPropertyValue(n).trim();
  const C = { glow: v("--glow"), accent: v("--accent"), gold: v("--gold"), ok: v("--ok"), muted: v("--muted"), line: v("--line"), text: v("--text") };
  const Chart = window.Chart;
  Chart.defaults.locale = "pt-BR"; Chart.defaults.color = C.muted; Chart.defaults.font.family = v("--font");
  Chart.defaults.borderColor = "rgba(127,149,187,.15)";
  const ds = range(), labels = ds.map(fmtShort);
  const base = { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
    plugins: { legend: { labels: { boxWidth: 12, boxHeight: 2 } } }, scales: { x: { ticks: { maxTicksLimit: 7, maxRotation: 0 } } } };
  const line = (label, data, color, extra = {}) => ({ label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: data.length > 45 ? 0 : 2.5, spanGaps: true, tension: .25, ...extra });
  const flat = (label, val, color) => line(label, ds.map(() => val), color, { borderDash: [6, 5], pointRadius: 0, borderWidth: 1.5 });
  const mk = (id, cfg, desc) => { const el = $("#" + id); if (!el) return; el.setAttribute("aria-label", desc); charts.push(new Chart(el, cfg)); };

  const peso = ds.map(d => S.days[d]?.peso ?? null);
  mk("c-peso", { type: "line", data: { labels, datasets: [
    line("Peso", peso, C.glow), line("Média 7 dias", movingAvg(peso), C.accent, { pointRadius: 0 }),
    ...(S.profile.metaPeso ? [flat("Meta", S.profile.metaPeso, C.ok)] : []),
    ...(S.profile.metaPeso && S.profile.metaMargem ? [
      { ...flat("Faixa da meta", S.profile.metaPeso + S.profile.metaMargem, C.ok), borderDash: [2, 4], borderWidth: 1 },
      { ...flat("Piso", S.profile.metaPeso - S.profile.metaMargem, C.ok), borderDash: [2, 4], borderWidth: 1 }] : [])] },
    options: { ...base, plugins: { legend: { labels: { boxWidth: 12, boxHeight: 2, filter: i => i.text !== "Piso" } } } } }, "Gráfico de peso ao longo do tempo");

  const abd = ds.map(d => S.days[d]?.abdomen ?? null);
  mk("c-abd", { type: "line", data: { labels, datasets: [line("Abdômen", abd, C.glow),
    ...(S.profile.metaAbdomen ? [flat("Meta", S.profile.metaAbdomen, C.ok)] : [])] }, options: base }, "Gráfico da circunferência do abdômen");

  mk("c-kcal", { data: { labels, datasets: [
    { type: "bar", label: "Consumidas", data: ds.map(d => Math.round(totals(mealsOf(d)).kcal) || null), backgroundColor: C.glow + "99" },
    { type: "line", ...line("Gastas", ds.map(d => spent(d)), C.gold, { pointRadius: 0 }) },
    ...(S.profile.metaKcal ? [{ type: "line", ...flat("Meta", S.profile.metaKcal, C.ok) }] : [])] }, options: base }, "Calorias consumidas e gastas por dia");

  const wk = Object.keys(S.weekly).sort().filter(d => d >= ds[0]);
  const palette = [C.glow, C.accent, C.gold, C.ok, "#ff8fb1", "#9be7ff", "#c4b5fd"];
  mk("c-week", { type: "line", data: { labels: wk.map(fmtShort), datasets: WEEKLY.map(([k, n], i) =>
    line(n, wk.map(d => S.weekly[d][k] ?? null), palette[i], { pointRadius: 3 })) }, options: base }, "Medidas corporais semanais");

  // treinos concluídos por semana (semanas terminando hoje)
  const weeks = [];
  for (let end = today(); end >= ds[0] && weeks.length < 26; end = addDays(end, -7)) {
    let n = 0; for (let i = 0; i < 7; i++) if (S.days[addDays(end, -i)]?.workout?.done) n++;
    weeks.unshift([fmtShort(addDays(end, -6)), n]);
  }
  mk("c-treinos", { type: "bar", data: { labels: weeks.map(w => w[0]), datasets: [{ label: "Treinos", data: weeks.map(w => w[1]), backgroundColor: C.accent + "cc" }] },
    options: { ...base, scales: { ...base.scales, y: { min: 0, max: 7, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } } }, "Treinos concluídos por semana");
};
