// Condição: métricas pessoais de saúde, sem obrigação e sem penalidade. Registrar os 4 itens de um dia (até o dia
// seguinte) vale +5 XP, seja qual for a resposta. O objetivo é enxergar padrões. Sono e celular na cama se referem à noite anterior;
// energia e foco, ao próprio dia.
import { views, actions, refresh } from "../core.js";
import { S, day, save } from "../store.js";
import { today, addDays, weekday, fmt, fmtDate, num, esc, WEEKDAYS } from "../util.js";
import { header, panel, toast, showEvents } from "../ui.js";
import { premiarCondicao, R } from "../game.js";
import { yearBoard } from "./assiduidade.js";

// Níveis de cada métrica: ok (verde) · warn (amarelo) · bad (vermelho)
export const sonoNivel = h => h == null ? null : h < 6 ? "bad" : h < 7 || h > 9 ? "warn" : "ok";
const SONO = { ok: "Recuperado", warn: "Fadiga leve", bad: "Exausto" };
const FOCO = [["ok", "Mente blindada"], ["warn", "Por um fio"], ["bad", "Brecha"]];
const ENERGIA = [["ok", "Alta"], ["warn", "Média"], ["bad", "Baixa"]];
const CAMA = [["ok", "Não"], ["bad", "Sim"]];

export const METRICS = {
  sono: { nome: "Sono", nivel: c => sonoNivel(c?.sono), label: c => c?.sono != null ? `${fmt(c.sono, 1)} h · ${SONO[sonoNivel(c.sono)]}` : "" },
  foco: { nome: "Foco", nivel: c => c?.foco ?? null, label: c => FOCO.find(x => x[0] === c?.foco)?.[1] || "" },
  energia: { nome: "Energia", nivel: c => c?.energia ?? null, label: c => ENERGIA.find(x => x[0] === c?.energia)?.[1] || "" },
  cama: { nome: "Celular na cama", nivel: c => c?.cama ?? null, label: c => CAMA.find(x => x[0] === c?.cama)?.[1] || "" },
};

let viewDate = null, boardMetric = "sono";
const curDate = () => viewDate || today();
const cond = d => S.days[d]?.cond;

function choice(campo, opcoes, atual) {
  return `<div class="row wrap" style="gap:6px">${opcoes.map(([v, nome]) =>
    `<button class="btn sm cd-${v} ${atual === v ? "on" : "ghost"}" data-act="setCond" data-campo="${campo}" data-v="${v}" aria-pressed="${atual === v}">${nome}</button>`).join("")}</div>`;
}

function registro() {
  const d = curDate(), c = cond(d) || {}, isToday = d === today(), nv = sonoNivel(c.sono);
  return panel(isToday ? "Hoje" : fmtDate(d), `
    <div class="row between" style="margin-bottom:10px">
      <button class="btn sm ghost" data-act="condDay" data-n="-1" aria-label="Dia anterior">◀</button>
      <span class="small muted">${isToday ? "Toque de novo para desmarcar" : "Registrando um dia passado"}${c && (S.days[d]?.condXp) ? " · XP recebido" : d >= addDays(today(), -1) ? ` · os 4 itens valem +${R.condicaoXp} XP` : ""}</span>
      <button class="btn sm ghost" data-act="condDay" data-n="1" ${isToday ? "disabled" : ""} aria-label="Próximo dia">▶</button></div>
    <div class="field"><label for="cd-sono">Sono da noite passada (horas)</label>
      <div class="row"><input id="cd-sono" inputmode="decimal" placeholder="ex.: 7,5" value="${c.sono != null ? String(c.sono).replace(".", ",") : ""}" data-chg="setSono" style="max-width:110px">
      <span class="chip cd-${nv || "none"}">${nv ? SONO[nv] : "sem registro"}</span></div>
      <div class="row wrap" style="gap:6px;margin-top:6px">${[5, 6, 6.5, 7, 7.5, 8, 9].map(h => `<button class="btn sm ghost" data-act="sonoRapido" data-h="${h}">${fmt(h, h % 1 ? 1 : 0)} h</button>`).join("")}</div></div>
    <div class="field"><label>Celular na cama ontem à noite</label>${choice("cama", CAMA, c.cama)}</div>
    <div class="field"><label>Energia hoje</label>${choice("energia", ENERGIA, c.energia)}</div>
    <div class="field" style="margin-bottom:0"><label>Foco</label>${choice("foco", FOCO, c.foco)}</div>`);
}

function setCond(campo, v) {
  const d = day(curDate()), c = (d.cond ||= {});
  if (v === null || c[campo] === v) delete c[campo]; else c[campo] = v;
  if (!Object.keys(c).length) delete d.cond;
  const ev = premiarCondicao(curDate());
  save(); refresh();
  if (ev) ev.levelUp ? showEvents("Condição registrada", [ev]) : toast(`Condição registrada: +${ev.xp} XP`);
}
actions.setCond = ({ campo, v }) => setCond(campo, v);
actions.sonoRapido = ({ h }) => setCond("sono", +h);
actions.setSono = (_, el) => {
  const h = num(el.value);
  if (el.value.trim() === "") return setCond("sono", null);
  if (h === null || h < 0 || h > 16) { toast("Informe as horas de sono (0 a 16)."); return; }
  const c = cond(curDate());
  if (c?.sono === h) return;
  setCond("sono", Math.round(h * 4) / 4);
};
actions.condDay = ({ n }) => { viewDate = addDays(curDate(), +n); if (viewDate >= today()) viewDate = null; refresh(); };

// ---- resumo dos últimos 30 dias ---------------------------------------------------------
function resumo() {
  const t = today(), ds = Array.from({ length: 30 }, (_, i) => addDays(t, -i)).filter(d => cond(d));
  if (!ds.length) return panel("Últimos 30 dias", `<p class="muted small">Nada registrado ainda. Registre quando lembrar: pular um dia não tem problema.</p>`);
  const conta = m => { const r = { ok: 0, warn: 0, bad: 0 }; ds.forEach(d => { const n = METRICS[m].nivel(cond(d)); if (n) r[n]++; }); return r; };
  const dots = r => `<span class="ok">${r.ok}●</span> <span class="warn">${r.warn}●</span> <span class="bad">${r.bad}●</span>`;
  const horas = ds.map(d => cond(d).sono).filter(h => h != null);
  const media = horas.length ? horas.reduce((a, b) => a + b, 0) / horas.length : null;
  const c = conta("cama");
  return panel("Últimos 30 dias", `<ul class="list small">
    <li><span class="grow">Sono</span><span class="num">${media != null ? `média ${fmt(media, 1)} h · ` : ""}${dots(conta("sono"))}</span></li>
    <li><span class="grow">Foco</span><span class="num">${dots(conta("foco"))}</span></li>
    <li><span class="grow">Energia</span><span class="num">${dots(conta("energia"))}</span></li>
    <li><span class="grow">Celular na cama</span><span class="num">${c.ok + c.bad ? `${c.bad} de ${c.ok + c.bad} noites` : "—"}</span></li></ul>
    <p class="small muted" style="margin-bottom:0">${ds.length} dia${ds.length > 1 ? "s" : ""} com registro. Sem penalidade, e o XP não depende das respostas: é para você se entender.</p>`);
}

// ---- padrões ------------------------------------------------------------------------
const pct = (n, d) => Math.round(n / d * 100);
function rate(dias, test) { const n = dias.filter(test).length; return { n, total: dias.length, p: dias.length ? pct(n, dias.length) : 0 }; }

export function insights(desde = addDays(today(), -180)) {
  const ds = Object.keys(S.days).filter(d => d >= desde && d <= today() && cond(d)).sort();
  const out = [], MIN = 3;
  const foco = ds.filter(d => cond(d).foco), brecha = d => cond(d).foco === "bad";
  // 1. dia da semana das Brechas
  const br = foco.filter(brecha);
  if (br.length >= MIN) {
    const porDia = Array(7).fill(0); br.forEach(d => porDia[weekday(d)]++);
    const top = porDia.map((n, i) => [n, i]).sort((a, b) => b[0] - a[0]).slice(0, 2);
    const share = pct(top[0][0] + top[1][0], br.length);
    out.push(share >= 50
      ? `<b>${share}%</b> das Brechas caíram em <b>${WEEKDAYS[top[0][1]].toLowerCase()}</b> e <b>${WEEKDAYS[top[1][1]].toLowerCase()}</b>.`
      : `As Brechas estão espalhadas pela semana: nenhum dia concentra a maioria.`);
  }
  // 2. sono da noite → foco do dia
  const curto = foco.filter(d => cond(d).sono != null && cond(d).sono < 6), bom = foco.filter(d => cond(d).sono >= 7);
  if (curto.length >= MIN && bom.length >= MIN) {
    const a = rate(curto, brecha), b = rate(bom, brecha);
    out.push(`Depois de noites com <b>menos de 6 h</b>, houve Brecha em <b>${a.p}%</b> dos dias; depois de <b>7 h ou mais</b>, em <b>${b.p}%</b>.`);
  }
  // 3. celular na cama → sono
  const comCel = ds.filter(d => cond(d).cama === "bad" && cond(d).sono != null), semCel = ds.filter(d => cond(d).cama === "ok" && cond(d).sono != null);
  if (comCel.length >= MIN && semCel.length >= MIN) {
    const m = arr => arr.reduce((a, d) => a + cond(d).sono, 0) / arr.length;
    out.push(`Com celular na cama você dormiu em média <b>${fmt(m(comCel), 1)} h</b>; sem, <b>${fmt(m(semCel), 1)} h</b>.`);
  }
  // 4. celular na cama → foco
  const fc = foco.filter(d => cond(d).cama === "bad"), fs = foco.filter(d => cond(d).cama === "ok");
  if (fc.length >= MIN && fs.length >= MIN) {
    out.push(`Brecha em <b>${rate(fc, brecha).p}%</b> dos dias depois de celular na cama, contra <b>${rate(fs, brecha).p}%</b> sem.`);
  }
  // 5. missão cumprida → foco
  const tr = foco.filter(d => S.days[d].workout?.done), nt = foco.filter(d => !S.days[d].workout?.done);
  if (tr.length >= MIN && nt.length >= MIN) {
    out.push(`Em dias de missão cumprida, Brecha em <b>${rate(tr, brecha).p}%</b>; nos outros dias, <b>${rate(nt, brecha).p}%</b>.`);
  }
  // 6. sono → energia
  const alta = ds.filter(d => cond(d).energia === "ok" && cond(d).sono != null), baixa = ds.filter(d => cond(d).energia === "bad" && cond(d).sono != null);
  if (alta.length >= MIN && baixa.length >= MIN) {
    const m = arr => arr.reduce((a, d) => a + cond(d).sono, 0) / arr.length;
    out.push(`Nos dias de energia <b>alta</b> você tinha dormido em média <b>${fmt(m(alta), 1)} h</b>; nos de energia <b>baixa</b>, <b>${fmt(m(baixa), 1)} h</b>.`);
  }
  // 7. treino → energia
  const et = ds.filter(d => cond(d).energia && S.days[d].workout?.done), en = ds.filter(d => cond(d).energia && !S.days[d].workout?.done);
  if (et.length >= MIN && en.length >= MIN) {
    const alto = d => cond(d).energia === "ok";
    out.push(`Energia alta em <b>${rate(et, alto).p}%</b> dos dias com treino e em <b>${rate(en, alto).p}%</b> dos dias sem.`);
  }
  return out;
}

function padroes() {
  const ins = insights();
  return panel("Padrões", ins.length ? `<ul class="list small">${ins.map(i => `<li><span class="grow">${i}</span></li>`).join("")}</ul>
      <p class="small muted" style="margin-bottom:0">Últimos 6 meses. Padrão não é regra: são só pistas do que te ajuda e do que te atrapalha.</p>`
    : `<p class="muted small" style="margin:0">Registre por umas 2 semanas e o Sistema começa a mostrar padrões aqui: dias da semana, efeito do sono, do celular na cama e dos treinos.</p>`);
}

function quadro() {
  const m = METRICS[boardMetric];
  const b = yearBoard({ key: "cond-" + boardMetric, statusOf: d => m.nivel(cond(d)) || "none", titleOf: d => m.label(cond(d)) });
  const leg = { sono: ["Recuperado (7–9 h)", "Fadiga leve", "Exausto (< 6 h)"], foco: FOCO.map(x => x[1]), energia: ENERGIA.map(x => x[1]), cama: ["Não", null, "Sim"] }[boardMetric];
  return panel("Quadro", `
    <div class="tabs">${Object.entries(METRICS).map(([k, x]) => `<button class="btn sm ${k === boardMetric ? "on" : ""}" data-act="condBoard" data-m="${k}">${k === "cama" ? "Celular" : x.nome}</button>`).join("")}</div>
    ${b.html}
    <div class="as-legend small muted">${["ok", "warn", "bad"].map((c, i) => leg[i] ? `<span><i class="as-c as-${c}"></i> ${esc(leg[i])}</span>` : "").join("")}
      <span><i class="as-c as-none"></i> sem registro</span></div>`, "", b.nav);
}
actions.condBoard = ({ m }) => { boardMetric = m; refresh(); };

views.condicao = arg => {
  if (arg === "ontem") { viewDate = addDays(today(), -1); history.replaceState(null, "", "#/condicao"); }
  return `${header()}<div class="stack">${registro()}${resumo()}${padroes()}${quadro()}</div>`;
};
