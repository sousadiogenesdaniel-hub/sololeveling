// Contadores (em Evolução): quantas repetições, segundos ou km você já fez de cada exercício nas missões.
// Primeiro os exercícios que treinam as provas do Teste de Rank, agrupados pela família dos marcos (com a barra até
// o próximo marco, que conta a família inteira); depois todos os outros. Conta as séries marcadas (no alvo ou
// abaixo) × o alvo da série; "cada perna/lado" conta os dois lados.
import { S } from "../store.js";
import { today, esc, fmt, fmtDate } from "../util.js";
import { panel } from "../ui.js";
import { EX_KEY } from "../tracks.js";
import { CONTADORES, totais, MARCOS } from "../conquistas.js";

const dobra = nome => /cada (perna|lado)/i.test(nome) ? 2 : 1;
function porExercicio() {
  const m = new Map();
  for (const [d, rec] of Object.entries(S.days)) {
    if (d > today()) continue;
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
const tempoTxt = s => s >= 3600 ? `${fmt(s / 3600, 1)} h` : s >= 120 ? `${fmt(s / 60)} min` : `${fmt(s)} s`;
const valor = x => x.un === "s" ? tempoTxt(x.total) : x.un === "km" ? `${fmt(x.total, 1)} km` : x.un === "m" ? `${fmt(x.total)} m` : fmt(x.total);
const linha = x => `<li><span class="grow" style="text-align:left">${esc(x.nome)}<br><span class="muted">${x.series} série${x.series > 1 ? "s" : ""} · última em ${fmtDate(x.ultima, { day: "2-digit", month: "2-digit" })}</span></span>
  <b class="num">${valor(x)}</b></li>`;

export function contadoresPanel() {
  const lista = porExercicio();
  if (!lista.length) return panel("Contadores", `<p class="muted small" style="margin:0">Nenhuma série marcada ainda. Cada série que você marca na missão soma aqui.</p>`);
  const t = totais(), destacados = new Set();
  const grupos = CONTADORES.map(c => {
    const xs = lista.filter(x => EX_KEY[x.nome] && c.re.test(x.nome) && (c.un === "s") === (x.un === "s"));
    if (!xs.length) return "";
    xs.forEach(x => destacados.add(x.nome));
    const v = t[c.id] || 0, prox = (MARCOS[c.id] || []).find(m => m > v);
    return `<div class="ct-fam"><div class="row between"><b>${c.nome}</b><span class="small muted">família: <b class="num">${c.un === "s" ? tempoTxt(v) : fmt(v)}</b></span></div>
      ${prox ? `<div class="bar" style="margin-top:4px;height:6px"><i style="width:${Math.min(100, v / prox * 100)}%"></i></div><div class="small muted">Próximo marco: ${c.un === "s" ? tempoTxt(prox) : fmt(prox)}</div>` : `<div class="small ok">Todos os marcos batidos</div>`}
      <ul class="list small">${xs.map(linha).join("")}</ul></div>`;
  }).join("");
  const outros = lista.filter(x => !destacados.has(x.nome));
  return panel("Contadores", `<p class="small muted" style="margin-top:0">Tudo o que você já fez nas missões: séries marcadas × o alvo de cada série. Primeiro os exercícios das provas do Teste de Rank; a barra é o próximo marco da família (cada marco deixa um corpo para o Exército).</p>
    ${grupos}${outros.length ? `<h3 style="margin:14px 0 4px">Outros exercícios</h3><ul class="list small">${outros.map(linha).join("")}</ul>` : ""}`,
    "", `<span class="chip">${lista.length}</span>`);
}
