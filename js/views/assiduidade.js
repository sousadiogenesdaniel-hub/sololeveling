// Quadros anuais: 12 meses a partir do mês em que você começou, um quadrinho por dia.
// yearBoard() é genérico (usado também pela aba Condição); attendanceBoard() é o dos treinos:
// verde = missão cumprida · vermelho = falta (a mesma lista de dívidas da Zona de Penalidade)
// cinza = descanso / sem cobrança · contorno = hoje, ainda pendente.
import { actions, refresh } from "../core.js";
import { S } from "../store.js";
import { today, iso, parseDay, fmt, fmtDate } from "../util.js";
import { panel } from "../ui.js";
import { isObligated } from "../game.js";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const chosen = {}; // ano escolhido nas setas, por quadro (ausente = ano atual)

export const startDay = () => S.profile?.criado || Object.keys(S.days).sort()[0] || today();

// statusOf(d) → "ok" | "warn" | "bad" | "rest" | "hoje" | "none"; titleOf(d, st) → texto do quadrinho
export function yearBoard({ key, statusOf, titleOf }) {
  const t = today(), s = parseDay(startDay());
  const mesesDesde = (parseDay(t).getFullYear() - s.getFullYear()) * 12 + parseDay(t).getMonth() - s.getMonth();
  const atual = Math.max(0, Math.floor(mesesDesde / 12)), page = Math.min(chosen[key] ?? atual, atual);
  const counts = { ok: 0, warn: 0, bad: 0 };
  let html = "";
  for (let k = 0; k < 12; k++) {
    const dt = new Date(s.getFullYear(), s.getMonth() + page * 12 + k, 1), y = dt.getFullYear(), m = dt.getMonth();
    const first = new Date(y, m, 1), dias = new Date(y, m + 1, 0).getDate();
    let cells = "";
    for (let i = 0; i < first.getDay(); i++) cells += `<i class="as-e"></i>`;
    for (let dd = 1; dd <= dias; dd++) {
      const d = iso(new Date(y, m, dd));
      const st = d > t ? "fut" : d < startDay() ? "none" : statusOf(d);
      if (st in counts) counts[st]++;
      const tt = titleOf?.(d, st);
      cells += `<i class="as-c as-${st}${d === t ? " as-today" : ""}" title="${fmtDate(d)}${tt ? ": " + tt : ""}"></i>`;
    }
    html += `<div class="as-m"><div class="as-name">${MESES[m]} <span class="muted">${String(y).slice(2)}</span></div>
      <div class="as-g">${"DSTQQSS".split("").map(l => `<b>${l}</b>`).join("")}${cells}</div></div>`;
  }
  const nav = atual > 0 ? `<div class="row" style="gap:6px">
      <button class="btn sm ghost" data-act="boardPage" data-key="${key}" data-atual="${atual}" data-n="-1" ${page === 0 ? "disabled" : ""} aria-label="Ano anterior">◀</button>
      <span class="small muted">Ano ${page + 1}</span>
      <button class="btn sm ghost" data-act="boardPage" data-key="${key}" data-atual="${atual}" data-n="1" ${page >= atual ? "disabled" : ""} aria-label="Próximo ano">▶</button></div>` : "";
  return { html: `<div class="as">${html}</div>`, nav, counts, multiAno: atual > 0 };
}

actions.boardPage = ({ key, atual, n }) => {
  chosen[key] = Math.max(0, Math.min(+atual, (chosen[key] ?? +atual) + +n)); refresh();
};

const LABEL = { ok: "missão cumprida", bad: "falta", rest: "descanso / sem cobrança", hoje: "hoje: missão pendente" };

export function attendanceBoard() {
  const t = today(), debts = new Set(S.debts.map(d => d.date));
  const b = yearBoard({
    key: "treino",
    statusOf: d => S.days[d]?.workout?.done ? "ok" : debts.has(d) ? "bad" : d === t && isObligated(t) ? "hoje" : "rest",
    titleOf: (d, st) => {
      const w = S.days[d]?.workout;
      return (LABEL[st] || "") + (st === "ok" && w?.indoor ? " (indoor, chuva)" : st === "ok" && !w?.hit && !w?.full ? " (séries parciais)" : "");
    },
  });
  const { ok, bad } = b.counts, cobrados = ok + bad, pct = cobrados ? Math.round(ok / cobrados * 100) : null;
  return panel("Assiduidade", `
    <div class="grid3" style="margin-bottom:12px">
      <div class="tile"><div class="lbl">Cumpridas</div><div class="val num ok">${ok}</div></div>
      <div class="tile"><div class="lbl">Faltas</div><div class="val num ${bad ? "bad" : ""}">${bad}</div></div>
      <div class="tile"><div class="lbl">Assiduidade</div><div class="val num">${pct === null ? "—" : pct + "%"}</div></div></div>
    ${b.html}
    <div class="as-legend small muted"><span><i class="as-c as-ok"></i> cumprida</span><span><i class="as-c as-bad"></i> falta</span>
      <span><i class="as-c as-rest"></i> descanso</span><span><i class="as-c as-hoje"></i> hoje, pendente</span></div>
    <p class="small muted" style="margin-bottom:0">Sequência atual: <b class="num">${fmt(S.game.streak)}</b> treinos · recorde: <b class="num">${fmt(S.game.bestStreak)}</b>. Assiduidade = cumpridas ÷ dias cobrados${b.multiAno ? " neste ano" : ""}.</p>`,
    "", b.nav);
}
