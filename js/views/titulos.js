// Sala dos Títulos, Janela de Status (atributos) e Relatório semanal.
import { views, actions, refresh } from "../core.js";
import { S, save } from "../store.js";
import { esc, fmt, fmtDate, addDays, signed } from "../util.js";
import { header, panel, toast } from "../ui.js";
import { weekStart } from "../game.js";
import { RAR, ORDEM_RAR } from "../premios.js";
import { TITULOS, tituloAtual, contexto, atributos, relatorio, CONTADORES, totais } from "../conquistas.js";
import { classeAtual } from "../sombras.js";
import { botaoCompartilhar } from "../cartao.js";

views.titulos = () => {
  const c = contexto(), tem = S.conquistas || {}, atual = tituloAtual();
  const porRar = [...ORDEM_RAR].reverse().map(r => [r, TITULOS.filter(t => t.rar === r && (!t.classe || t.classe === S.classe || tem[t.id]))]).filter(([, l]) => l.length);
  const item = t => {
    const ok = !!tem[t.id], cor = RAR[t.rar].cor;
    if (!ok && t.secreto) return `<li><span class="grow"><b class="muted">???</b><br><span class="small muted">Título secreto</span></span></li>`;
    const [a, m] = t.prog ? t.prog(c) : [ok ? 1 : 0, 1];
    return `<li style="display:block"><div class="row between"><span class="grow"><b style="color:${ok ? cor : "var(--muted)"}">${esc(t.nome)}</b>
        ${t.classe ? `<span class="small muted"> · ${t.classe === "necromante" ? "Necromante" : t.classe}</span>` : ""}</span>
        ${ok ? (atual?.id === t.id ? `<span class="chip" style="color:${cor}">Em uso</span>` : `<button class="btn sm" data-act="usarTitulo" data-id="${t.id}">Usar</button>`) : ""}</div>
      <div class="small muted">${esc(t.desc)}${ok ? ` · conquistado em ${fmtDate(tem[t.id])}` : ""}</div>
      ${!ok && t.prog && m > 1 ? `<div class="bar" style="margin-top:4px;height:6px"><i style="width:${Math.min(100, a / m * 100)}%"></i></div><div class="small muted num">${fmt(Math.min(a, m), m < 50 ? 0 : 0)} / ${fmt(m)}</div>` : ""}</li>`;
  };
  const n = TITULOS.filter(t => tem[t.id]).length;
  return `${header()}<div class="stack">
    ${panel("Sala dos Títulos", `<p style="margin-top:0">Título em uso: ${atual ? `<b style="color:${RAR[atual.rar].cor}">${esc(atual.nome)}</b>` : "nenhum"}</p>
      <p class="small muted" style="margin-bottom:0">${n} de ${TITULOS.length} títulos. Os secretos só aparecem quando você conquista. Toque em "Usar" para exibir um título embaixo do seu nome.</p>`)}
    ${porRar.map(([r, l]) => panel(RAR[r].nome, `<ul class="list">${l.map(item).join("")}</ul>`, "", `<span class="raro-chip" style="color:${RAR[r].cor}">${l.filter(t => tem[t.id]).length}/${l.length}</span>`)).join("")}</div>`;
};
actions.usarTitulo = ({ id }) => { if (S.conquistas?.[id]) { S.titulo = id; save(); refresh(); toast("Título trocado."); } };

// Janela de Status (usada no Perfil)
export function janelaStatus() {
  const a = atributos(), cl = classeAtual(), t = tituloAtual();
  return `<div class="row between small" style="margin-bottom:6px"><span>Classe: <b>${cl ? cl.nome : "Humano"}</b>${cl ? "" : ` <a href="#/exercito" class="muted">· escolhe no rank D</a>`}</span>
      <a href="#/titulos" style="color:${t ? RAR[t.rar].cor : "inherit"}">${t ? esc(t.nome) : "Títulos"} ›</a></div>
    ${a.map(x => `<div class="attr" title="${esc(x.como)}"><b>${x.id}</b><div class="bar"><i style="width:${x.v}%"></i></div><span class="num" style="text-align:right">${x.v}</span></div>`).join("")}
    <details class="small muted"><summary>Como cada atributo é calculado</summary><ul style="padding-left:18px;margin:6px 0 0">
      ${a.map(x => `<li><b>${x.nome}</b>: ${esc(x.como)}</li>`).join("")}</ul><p style="margin:6px 0 0">Vão de 10 a 100; 100 é o nível de um Monarca. Sobem quando você melhora de verdade (e caem se parar).</p></details>`;
}

// ---- relatório semanal ----
views.relatorio = arg => {
  const atual = weekStart(), ws = arg && /^\d{4}-\d{2}-\d{2}$/.test(arg) ? weekStart(arg) : addDays(atual, -7);
  const r = relatorio(ws);
  const lin = (n, v, ant) => `<tr><td>${n}</td><td class="num">${fmt(v, n === "Km" ? 1 : 0)}</td><td class="num ${v > ant ? "ok" : v < ant ? "bad" : "muted"}">${ant === v ? "=" : signed(v - ant, n === "Km" ? 1 : 0)}</td></tr>`;
  const reps = [...CONTADORES.filter(c => r.t[c.id] || r.ant[c.id]).map(c => lin(c.nome + (c.un === "s" ? " (s)" : ""), r.t[c.id], r.ant[c.id])), r.t.km || r.ant.km ? lin("Km", r.t.km, r.ant.km) : ""].join("");
  const fd = d => fmtDate(d, { day: "2-digit", month: "2-digit" });
  return `${header()}<div class="stack">
    ${panel("Relatório semanal", `<div class="row between"><a class="btn sm ghost" href="#/relatorio/${addDays(ws, -7)}">‹ anterior</a>
        <b class="num">${fd(r.ws)} a ${fd(r.we)}</b>
        ${ws < addDays(atual, -7) ? `<a class="btn sm ghost" href="#/relatorio/${addDays(ws, 7)}">próxima ›</a>` : `<span style="width:80px"></span>`}</div>
      <div class="grid3" style="margin-top:12px">
        <div class="tile"><div class="lbl">Missões</div><div class="val num ${r.missoes >= r.cobradas && r.cobradas ? "ok" : ""}">${r.missoes}/${r.cobradas}</div></div>
        <div class="tile"><div class="lbl">XP</div><div class="val num">${r.xp >= 0 ? "+" : ""}${fmt(r.xp)}</div></div>
        <div class="tile"><div class="lbl">Nível</div><div class="val num">${r.nivelIni}→${r.nivelFim}</div></div>
        <div class="tile"><div class="lbl">Ouro ganho</div><div class="val num gold">${fmt(r.ouro)}</div></div>
        <div class="tile"><div class="lbl">Faltas</div><div class="val num ${r.faltas ? "bad" : "ok"}">${r.faltas}</div></div>
        <div class="tile"><div class="lbl">Peso</div><div class="val num">${r.peso == null ? "—" : signed(r.peso, 1) + " kg"}</div></div></div>`)}
    ${reps ? panel("Volume da semana", `<table class="t"><tr><th></th><th>Semana</th><th>vs anterior</th></tr>${reps}</table>`) : ""}
    ${panel("Destaques", `<ul class="list small">
      ${r.recordes.map(x => `<li><span class="grow">Recorde: ${esc(x.nome)}</span><b class="gold num">${x.de} → ${x.para}</b></li>`).join("")}
      ${r.titulos.map(t => `<li><span class="grow">Título: <b style="color:${RAR[t.rar].cor}">${esc(t.nome)}</b></span></li>`).join("")}
      ${r.portao?.status === "vencido" ? `<li><span class="grow">Portão vencido (rank ${r.portao.rank})</span></li>` : r.portao?.status === "falhou" ? `<li><span class="grow bad">Portão: falhou</span></li>` : ""}
      ${r.sombras ? `<li><span class="grow">${r.sombras} sombra${r.sombras > 1 ? "s" : ""} extraída${r.sombras > 1 ? "s" : ""}</span></li>` : ""}
      ${r.impulsos ? `<li><span class="grow">${r.impulsos} impulso${r.impulsos > 1 ? "s" : ""} vencido${r.impulsos > 1 ? "s" : ""}</span></li>` : ""}
      ${!r.recordes.length && !r.titulos.length && !r.sombras && !r.impulsos && r.portao?.status !== "vencido" ? `<li class="muted">Nenhum destaque nesta semana.</li>` : ""}</ul>
      ${botaoCompartilhar("semana", { missoes: r.missoes, cobradas: r.cobradas, xp: r.xp, nivelIni: r.nivelIni, nivelFim: r.nivelFim })}`)}</div>`;
};
