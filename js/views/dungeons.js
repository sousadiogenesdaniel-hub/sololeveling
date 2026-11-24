// Registro de Dungeons: a coleção das dungeons vencidas, em cards. Só aparecem as vencidas (nada de silhueta).
// Filtro por tipo (todas, Dungeon, Red Dungeon, de Emergência, nomeadas) e por rank. Cada tipo tem a sua cor:
// azul (a dungeon comum), vermelho (Red), laranja (Emergência); as nomeadas têm um card especial.
import { views, actions, refresh } from "../core.js";
import { esc, fmt, fmtDate } from "../util.js";
import { header, panel, modal } from "../ui.js";
import { DUNGEON, MODO_NOME, registroDungeons } from "../portoes.js";

const FILTROS = [["todas", "Todas"], ["normal", "Dungeon"], ["vermelho", "Red Dungeon"], ["emergencia", "Emergência"], ["nomeadas", "Nomeadas"]];
const RANKS = ["E", "D", "C", "B", "A", "S"];
let filtro = "todas", rankF = "";
const passa = r => (filtro === "todas" || (filtro === "nomeadas" ? DUNGEON[r.tipo]?.nomeada : r.tipo === filtro)) && (!rankF || r.rank === rankF);
const numero = r => DUNGEON[r.tipo]?.nomeada ? "" : `#${String(r.n).padStart(3, "0")}`;

// Arte do card: o portal no estilo do anime (anel girando na cor do tipo); a nomeada tem coroa de chamas (provisório)
const portal = (r, tam = 76) => {
  const D = DUNGEON[r.tipo] || DUNGEON.normal, c = D.cor;
  return `<svg class="dg-portal ${D.nomeada ? "nomeada" : ""}" viewBox="0 0 100 100" width="${tam}" height="${tam}" aria-hidden="true">
    <defs><radialGradient id="dg${r.id}"><stop offset="0" stop-color="#02030a"/><stop offset=".55" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>
    <circle cx="50" cy="50" r="46" fill="url(#dg${r.id})"/>
    <g class="dg-gira"><ellipse cx="50" cy="50" rx="34" ry="34" fill="none" stroke="${c}" stroke-width="3" stroke-dasharray="40 14"/>
      <ellipse cx="50" cy="50" rx="24" ry="24" fill="none" stroke="${c}" stroke-opacity=".6" stroke-width="2" stroke-dasharray="20 10"/></g>
    <circle cx="50" cy="50" r="14" fill="#02030a" stroke="${c}" stroke-width="1.5"/>
    ${D.nomeada ? `<path d="M30 20 L36 8 L42 18 L50 4 L58 18 L64 8 L70 20" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>` : ""}</svg>`;
};

views.dungeons = () => {
  const todas = registroDungeons(), lista = todas.filter(passa).slice().reverse();
  const conta = k => k === "nomeadas" ? todas.filter(r => DUNGEON[r.tipo]?.nomeada).length : k === "todas" ? todas.length : todas.filter(r => r.tipo === k).length;
  return `${header()}<div class="stack">
    ${panel("Registro de Dungeons", `<p class="small muted" style="margin-top:0">Toda dungeon vencida vira um card numerado. Só aparecem as que você já venceu.</p>
      <div class="row wrap dg-filtros" role="group" aria-label="Tipo">${FILTROS.map(([k, n]) => `<button class="btn sm ${filtro === k ? "primary" : "ghost"}" data-act="dgFiltro" data-k="${k}" aria-pressed="${filtro === k}">${n} <span class="num">${conta(k)}</span></button>`).join("")}</div>
      <div class="field" style="margin:10px 0 0"><label for="dg-rank">Rank</label><select id="dg-rank" data-chg="dgRank"><option value="">Todos</option>${RANKS.map(r => `<option value="${r}" ${rankF === r ? "selected" : ""}>${r}</option>`).join("")}</select></div>`,
      "", `<span class="chip">${todas.length}</span>`)}
    ${lista.length ? `<div class="dg-grade">${lista.map(r => { const D = DUNGEON[r.tipo] || DUNGEON.normal;
      return `<button type="button" class="dg-card ${D.nomeada ? "nomeada" : ""}" style="--c:${D.cor}" data-act="dgFicha" data-id="${r.id}">
        ${portal(r)}<span class="dg-num">${numero(r) || "★"}</span><b class="dg-nome">${esc(D.nome)}</b>
        <span class="dg-info">Rank ${r.rank || "?"} · ${fmtDate(r.d, { day: "2-digit", month: "2-digit", year: "2-digit" })}</span></button>`; }).join("")}</div>`
      : panel("Nada por aqui", `<p class="muted small" style="margin:0">${todas.length ? "Nenhuma dungeon com esse filtro." : "Nenhuma dungeon vencida ainda. Quando uma se abrir, vença para ela entrar aqui."}</p>`)}
    <a class="btn ghost block" href="#/portao">Dungeon aberta agora</a></div>`;
};

actions.dgFiltro = ({ k }) => { filtro = k; refresh(); };
actions.dgRank = (_, el) => { rankF = el.value; refresh(); };
actions.dgFicha = ({ id }) => {
  const r = registroDungeons().find(x => x.id === id); if (!r) return;
  const D = DUNGEON[r.tipo] || DUNGEON.normal;
  const un = it => it.un === "s" ? " s" : it.un === "rodada" ? "" : "";
  modal(`<div class="dg-ficha" style="--c:${D.cor}">
    <div class="row between"><span class="raro-chip" style="color:${D.cor}">${esc(D.nome)} ${numero(r)}</span><button class="btn sm ghost" data-close>Fechar</button></div>
    <div style="display:grid;place-items:center;margin:8px 0">${portal(r, 130)}</div>
    <p class="center small muted" style="margin:0">Rank ${r.rank || "?"} · vencida em ${fmtDate(r.d)}${r.minutos != null ? ` · ${fmt(r.minutos, r.minutos < 10 ? 1 : 0)} min${r.limite ? ` de ${r.limite}` : ""}` : ""}</p>
    <h3 class="center" style="margin:8px 0 0;color:${D.cor};text-transform:none">${esc(r.titulo || D.nome)}</h3>
    ${r.modo && MODO_NOME[r.modo] && MODO_NOME[r.modo] !== r.titulo ? `<p class="center small muted" style="margin:2px 0 0">${MODO_NOME[r.modo]}</p>` : ""}
    ${r.desc ? `<p class="small">${esc(r.desc)}</p>` : ""}
    ${r.itens.length ? `<h3 style="margin:12px 0 4px">Exercícios</h3><ul class="list small">${r.itens.map(it => `<li><span class="grow" style="text-align:left">${esc(it.nome)}</span>${it.un === "rodada" ? "" : `<b class="num">${fmt(it.alvo)}${un(it)}</b>`}</li>`).join("")}</ul>` : ""}
    ${r.gps?.length ? `<ul class="list small">${r.gps.map(g => `<li><span class="grow" style="text-align:left">${esc(g.nome)} (GPS)</span><b class="num">${g.km} km</b></li>`).join("")}</ul>` : ""}
    <h3 style="margin:12px 0 4px">Recebido</h3>
    <ul class="list small">${r.premios.length ? r.premios.map(p => `<li><span class="grow" style="text-align:left">${esc(p)}</span></li>`).join("") : `<li class="muted">—</li>`}</ul></div>`);
};
