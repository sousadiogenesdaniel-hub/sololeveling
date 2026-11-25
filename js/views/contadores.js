// Contadores (em Evolução): quantas repetições, segundos ou km você já fez de cada exercício. Soma a missão (séries
// marcadas × alvo), o Teste de Rank e a Avaliação (o resultado de cada prova) e as dungeons (os itens feitos).
// Primeiro as famílias dos marcos (com a barra até o próximo marco), com todos os exercícios da família: os das
// provas do Teste de Rank vêm antes. Depois os exercícios sem família.
import { esc, fmt, fmtDate } from "../util.js";
import { panel } from "../ui.js";
import { EX_KEY } from "../tracks.js";
import { CONTADORES, totais, MARCOS, feitosExercicios, familia } from "../conquistas.js";
import { today } from "../util.js";

function porExercicio() {
  const m = new Map(), t = today();
  for (const f of feitosExercicios()) {
    if (f.d > t) continue;
    const x = m.get(f.nome) || { nome: f.nome, un: f.un, total: 0, series: 0, teste: new Set(), avaliacao: new Set(), anterior: new Set(), dungeon: new Set(), ultima: "" };
    x.total += f.qtd;
    if (f.fonte === "missao") x.series += f.series; else x[f.fonte]?.add(f.ref);
    if (f.d > x.ultima) x.ultima = f.d;
    m.set(f.nome, x);
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}
const tempoTxt = s => s >= 3600 ? `${fmt(s / 3600, 1)} h` : s >= 120 ? `${fmt(s / 60)} min` : `${fmt(s)} s`;
const valor = x => x.un === "s" ? tempoTxt(x.total) : x.un === "km" ? `${fmt(x.total, 1)} km` : x.un === "m" ? `${fmt(x.total)} m` : fmt(x.total);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
// de onde veio: séries da missão, tentativas do Teste de Rank, avaliações, resultados antigos e dungeons
const origem = x => [x.series && plural(x.series, "série", "séries"), x.teste.size && plural(x.teste.size, "Teste de Rank", "Testes de Rank"),
  x.avaliacao.size && plural(x.avaliacao.size, "avaliação", "avaliações"), x.anterior.size && plural(x.anterior.size, "prova anterior", "provas anteriores"),
  x.dungeon.size && plural(x.dungeon.size, "dungeon", "dungeons")].filter(Boolean).join(" · ");
const linha = x => `<li><span class="grow" style="text-align:left">${esc(x.nome)}${EX_KEY[x.nome] ? ` <span class="small" style="color:var(--glow)">⚔</span>` : ""}<br>
  <span class="muted">${origem(x)} · última em ${fmtDate(x.ultima, { day: "2-digit", month: "2-digit" })}</span></span>
  <b class="num">${valor(x)}</b></li>`;

export function contadoresPanel() {
  const lista = porExercicio();
  if (!lista.length) return panel("Contadores", `<p class="muted small" style="margin:0">Nada ainda. Cada série que você marca na missão, cada prova de teste ou avaliação e cada item feito numa dungeon soma aqui.</p>`);
  const t = totais(), naFamilia = new Set();
  const grupos = CONTADORES.map(c => {
    const xs = lista.filter(x => familia(x.nome, x.un) === c).sort((a, b) => (!!EX_KEY[b.nome] - !!EX_KEY[a.nome]) || b.total - a.total);
    if (!xs.length) return "";
    xs.forEach(x => naFamilia.add(x.nome));
    const v = t[c.id] || 0, prox = (MARCOS[c.id] || []).find(m => m > v);
    return `<div class="ct-fam"><div class="row between"><b>${c.nome}</b><span class="small muted">família: <b class="num">${c.un === "s" ? tempoTxt(v) : fmt(v)}</b></span></div>
      ${prox ? `<div class="bar" style="margin-top:4px;height:6px"><i style="width:${Math.min(100, v / prox * 100)}%"></i></div><div class="small muted">Próximo marco: ${c.un === "s" ? tempoTxt(prox) : fmt(prox)}</div>` : `<div class="small ok">Todos os marcos batidos</div>`}
      <ul class="list small">${xs.map(linha).join("")}</ul></div>`;
  }).join("");
  const outros = lista.filter(x => !naFamilia.has(x.nome));
  return panel("Contadores", `<p class="small muted" style="margin-top:0">Tudo o que você já fez: as séries da missão, as provas do Teste de Rank e da Avaliação e os exercícios das dungeons. Primeiro as famílias dos marcos, com todos os exercícios delas (⚔ = prova do Teste de Rank); a barra é o próximo marco da família (cada marco deixa um corpo para o Exército).</p>
    ${grupos}${outros.length ? `<h3 style="margin:14px 0 4px">Outros exercícios</h3><ul class="list small">${outros.map(linha).join("")}</ul>` : ""}`,
    "", `<span class="chip">${lista.length}</span>`);
}
