// Quadro de assiduidade: 12 meses a partir do mês em que você começou, um quadrinho por dia.
// Verde = missão cumprida · vermelho = falta (a mesma lista de dívidas da Zona de Penalidade)
// cinza = descanso / sem cobrança · contorno = hoje, ainda pendente.
import { actions, refresh } from "../core.js";
import { S } from "../store.js";
import { today, iso, parseDay, esc, fmt, fmtDate } from "../util.js";
import { panel } from "../ui.js";
import { isObligated } from "../game.js";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const LABEL = { ok: "missão cumprida", bad: "falta", rest: "descanso / sem cobrança", hoje: "hoje: missão pendente", fut: "", none: "" };
let chosen = null; // ano escolhido nas setas (null = ano atual)

const startDay = () => S.profile?.criado || Object.keys(S.days).sort()[0] || today();

function status(d, t, debts) {
  if (d > t) return "fut";
  if (d < startDay()) return "none";
  if (S.days[d]?.workout?.done) return "ok";
  if (debts.has(d)) return "bad";
  if (d === t) return isObligated(t) ? "hoje" : "rest";
  return "rest";
}

function monthHtml(y, m, t, debts, counts) {
  const first = new Date(y, m, 1), dias = new Date(y, m + 1, 0).getDate();
  let cells = "";
  for (let i = 0; i < first.getDay(); i++) cells += `<i class="as-e"></i>`;
  for (let dd = 1; dd <= dias; dd++) {
    const d = iso(new Date(y, m, dd)), st = status(d, t, debts);
    if (st in counts) counts[st]++;
    const w = S.days[d]?.workout;
    const extra = st === "ok" && w?.indoor ? " (indoor, chuva)" : st === "ok" && !w?.full ? " (séries parciais)" : "";
    cells += `<i class="as-c as-${st}${d === t ? " as-today" : ""}" title="${fmtDate(d)}${LABEL[st] ? ": " + LABEL[st] + extra : ""}"></i>`;
  }
  return `<div class="as-m"><div class="as-name">${MESES[m]} <span class="muted">${String(y).slice(2)}</span></div>
    <div class="as-g">${"DSTQQSS".split("").map(l => `<b>${l}</b>`).join("")}${cells}</div></div>`;
}

export function attendanceBoard() {
  const t = today(), s = parseDay(startDay());
  const debts = new Set(S.debts.map(d => d.date));
  const mesesDesde = (parseDay(t).getFullYear() - s.getFullYear()) * 12 + parseDay(t).getMonth() - s.getMonth();
  const atual = Math.floor(mesesDesde / 12), total = atual + 1;
  const page = Math.min(chosen ?? atual, atual);
  const counts = { ok: 0, bad: 0 };
  let html = "";
  for (let k = 0; k < 12; k++) {
    const dt = new Date(s.getFullYear(), s.getMonth() + page * 12 + k, 1);
    html += monthHtml(dt.getFullYear(), dt.getMonth(), t, debts, counts);
  }
  const cobrados = counts.ok + counts.bad, pct = cobrados ? Math.round(counts.ok / cobrados * 100) : null;
  const nav = total > 1 ? `<div class="row" style="gap:6px">
      <button class="btn sm ghost" data-act="boardPage" data-n="-1" ${page === 0 ? "disabled" : ""} aria-label="Ano anterior">◀</button>
      <span class="small muted" data-atual="${atual}">Ano ${page + 1}</span>
      <button class="btn sm ghost" data-act="boardPage" data-n="1" ${page >= atual ? "disabled" : ""} aria-label="Próximo ano">▶</button></div>` : "";
  return panel("Assiduidade", `
    <div class="grid3" style="margin-bottom:12px">
      <div class="tile"><div class="lbl">Cumpridas</div><div class="val num ok">${counts.ok}</div></div>
      <div class="tile"><div class="lbl">Faltas</div><div class="val num ${counts.bad ? "bad" : ""}">${counts.bad}</div></div>
      <div class="tile"><div class="lbl">Assiduidade</div><div class="val num">${pct === null ? "—" : pct + "%"}</div></div></div>
    <div class="as">${html}</div>
    <div class="as-legend small muted"><span><i class="as-c as-ok"></i> cumprida</span><span><i class="as-c as-bad"></i> falta</span>
      <span><i class="as-c as-rest"></i> descanso</span><span><i class="as-c as-hoje"></i> hoje, pendente</span></div>
    <p class="small muted" style="margin-bottom:0">Sequência atual: <b class="num">${fmt(S.game.streak)}</b> treinos · recorde: <b class="num">${fmt(S.game.bestStreak)}</b>. Assiduidade = cumpridas ÷ dias cobrados${total > 1 ? " neste ano" : ""}.</p>`,
    "", nav);
}

actions.boardPage = ({ n }, el) => {
  const atual = +el.closest(".panel").querySelector("[data-atual]").dataset.atual;
  chosen = Math.max(0, Math.min(atual, (chosen ?? atual) + +n)); refresh();
};
