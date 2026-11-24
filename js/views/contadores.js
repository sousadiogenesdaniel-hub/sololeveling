// Contadores: quantas repetições (e segundos, e km) você já fez de cada exercício nas missões.
// Primeiro as provas do Teste de Rank (somando os exercícios que treinam cada prova), depois os destaques
// (flexão pike, agachamento búlgaro, abdominal supra), os marcos por família e a lista de todos os exercícios.
// Conta as séries marcadas (no alvo ou abaixo) × o alvo da série; "cada perna/lado" conta os dois lados.
import { views, actions, refresh } from "../core.js";
import { S } from "../store.js";
import { today, esc, fmt, fmtDate } from "../util.js";
import { header, panel } from "../ui.js";
import { weekStart } from "../game.js";
import { EX_KEY, TEST_KEY, pr, currentPhase, currentTrack } from "../tracks.js";
import { CONTADORES, totais, MARCOS } from "../conquistas.js";

const PERIODOS = [["sempre", "Sempre"], ["mes", "Este mês"], ["semana", "Esta semana"]];
let periodo = "sempre";
const desdeDe = p => p === "mes" ? today().slice(0, 8) + "01" : p === "semana" ? weekStart() : "";
const DESTAQUES = [["Flexão pike", /^flexão pike/i], ["Agachamento búlgaro", /búlgaro/i], ["Abdominal supra", /abdomina(l|is) supra/i]];
const dobra = nome => /cada (perna|lado)/i.test(nome) ? 2 : 1;

// Total por exercício (nome exato do treino) no período
function porExercicio(desde) {
  const m = new Map();
  for (const [d, rec] of Object.entries(S.days)) {
    if (d < desde || d > today()) continue;
    const w = rec.workout; if (!w?.done || w.plano?.modo) continue;
    (w.plano?.itens || []).forEach((it, e) => {
      const n = (w.sets?.[e] || []).filter(Boolean).length; if (!n) return;
      const x = m.get(it.nome) || { nome: it.nome, un: it.un, total: 0, series: 0, ultima: "" };
      x.total += it.alvo * n * (it.un === "reps" || it.un === "s" ? dobra(it.nome) : 1); x.series += n;
      if (d > x.ultima) x.ultima = d;
      m.set(it.nome, x);
    });
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}
const unTxt = (v, un) => un === "s" ? `${fmt(v)} s` : un === "km" ? `${fmt(v, 1)} km` : un === "m" ? `${fmt(v)} m` : fmt(v);
const tempoTxt = s => s >= 3600 ? `${fmt(s / 3600, 1)} h` : s >= 120 ? `${fmt(s / 60)} min` : `${fmt(s)} s`;

function provasPanel(lista) {
  const t = currentTrack(); if (!t) return "";
  const ph = currentPhase(), metas = Object.fromEntries((ph?.tests || []).map(([n, alvo, un]) => [TEST_KEY[n], [alvo, un]]));
  // todas as provas da trilha, na ordem em que aparecem
  const provas = [];
  for (const f of t.phases) for (const [n, , un] of f.tests) { const k = TEST_KEY[n]; if (k && !provas.some(p => p.k === k)) provas.push({ k, nome: n.replace(/ seguid[oa]s$/, ""), un }); }
  const somaDe = k => lista.filter(x => EX_KEY[x.nome] === k).reduce((n, x) => n + x.total, 0);
  return panel("Provas do Teste de Rank", `<p class="small muted" style="margin-top:0">Quanto você já treinou de cada prova (somando os exercícios que treinam ela), o seu recorde e a meta do teste da fase atual.</p>
    <ul class="list small">${provas.map(p => { const tot = somaDe(p.k), rec = pr(p.k), meta = metas[p.k];
      return `<li style="display:block"><div class="row between"><b>${esc(p.nome)}</b><b class="num glow">${p.un === "s" ? tempoTxt(tot) : p.un === "km" ? "—" : fmt(tot)}</b></div>
        <div class="row between muted"><span>Recorde: <b class="num">${rec != null ? unTxt(rec, p.un) : "—"}</b></span><span>${meta ? `Meta: <b class="num">${unTxt(meta[0], meta[1])}</b>` : ""}</span></div></li>`; }).join("")}</ul>`);
}

function destaquesPanel(lista) {
  return panel("Destaques", `<div class="grid3">${DESTAQUES.map(([nome, re]) => { const xs = lista.filter(x => re.test(x.nome)), tot = xs.reduce((n, x) => n + x.total, 0);
    return `<div class="tile"><div class="lbl">${nome}</div><div class="val num">${fmt(tot)}</div><div class="small muted">${xs.reduce((n, x) => n + x.series, 0)} séries</div></div>`; }).join("")}</div>
    <p class="small muted" style="margin-bottom:0">Somam todas as variações (ex.: búlgaro no banco, com salto e lento). Búlgaro conta as duas pernas.</p>`);
}

function familiasPanel(desde) {
  const t = totais(today(), desde);
  const linha = c => { const v = t[c.id] || 0, prox = (MARCOS[c.id] || []).find(m => m > v);
    return `<li style="display:block"><div class="row between"><span>${c.nome}</span><b class="num">${c.un === "s" ? tempoTxt(v) : fmt(v)}</b></div>
      ${periodo === "sempre" && prox ? `<div class="bar" style="margin-top:4px;height:6px"><i style="width:${Math.min(100, v / prox * 100)}%"></i></div><div class="small muted">Próximo marco: ${c.un === "s" ? tempoTxt(prox) : fmt(prox)}</div>` : ""}</li>`; };
  return panel("Por família (os marcos)", `<ul class="list small">${CONTADORES.map(linha).join("")}
      <li><span class="grow">Km (missões e atividades)</span><b class="num">${fmt(t.km, 1)}</b></li>
      <li><span class="grow">Missões cumpridas</span><b class="num">${fmt(t.missoes)}</b></li></ul>
    <p class="small muted" style="margin-bottom:0">Cada marco novo (100, 500, 1.000…) deixa um corpo para o Exército.</p>`);
}

function todosPanel(lista) {
  if (!lista.length) return panel("Todos os exercícios", `<p class="muted small" style="margin:0">Nenhuma série marcada ${periodo === "sempre" ? "ainda" : "neste período"}.</p>`);
  return panel("Todos os exercícios", `<ul class="list small">${lista.map(x => `<li><span class="grow" style="text-align:left">${esc(x.nome)}<br>
      <span class="muted">${x.series} série${x.series > 1 ? "s" : ""} · última em ${fmtDate(x.ultima, { day: "2-digit", month: "2-digit" })}</span></span>
      <b class="num">${x.un === "s" ? tempoTxt(x.total) : unTxt(x.total, x.un)}</b></li>`).join("")}</ul>`, "", `<span class="chip">${lista.length}</span>`);
}

views.contadores = () => {
  const desde = desdeDe(periodo), lista = porExercicio(desde);
  return `${header()}<div class="stack">
    ${panel("Contadores", `<p class="small muted" style="margin-top:0">Tudo o que você já fez nas missões: as séries marcadas vezes o alvo de cada série.</p>
      <div class="row wrap" style="gap:6px" role="group" aria-label="Período">${PERIODOS.map(([k, n]) => `<button class="btn sm ${periodo === k ? "primary" : "ghost"}" data-act="ctPeriodo" data-k="${k}" aria-pressed="${periodo === k}">${n}</button>`).join("")}</div>`)}
    ${provasPanel(lista)}${destaquesPanel(lista)}${familiasPanel(desde)}${todosPanel(lista)}</div>`;
};
actions.ctPeriodo = ({ k }) => { periodo = k; refresh(); };
