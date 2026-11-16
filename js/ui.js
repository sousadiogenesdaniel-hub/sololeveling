// Componentes de interface: modal, notificação do Sistema, toast, cabeçalho.
import { $, esc, fmt } from "./util.js";
import { S } from "./store.js";
import { levelInfo } from "./game.js";

export function toast(msg, ms = 2600) {
  let t = $("#toast"); if (t) t.remove();
  t = document.createElement("div"); t.id = "toast"; t.textContent = msg; t.setAttribute("role", "status");
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

export function closeModal() { $(".overlay")?.remove(); }

// Abre um modal com HTML. Fecha ao clicar fora ou em [data-close].
export function modal(html, { sys = false, onClose } = {}) {
  closeModal();
  const o = document.createElement("div");
  o.className = "overlay";
  o.innerHTML = `<div class="panel ${sys ? "sysmsg" : ""}" role="dialog" aria-modal="true">${html}</div>`;
  o.addEventListener("click", e => {
    if (e.target === o || e.target.closest("[data-close]")) { o.remove(); onClose?.(); }
  });
  document.body.append(o);
  return o;
}

// Janela no estilo "notificação do Sistema"
export function sysMessage(titulo, corpoHtml, { botao = "Entendido", onClose } = {}) {
  return modal(`
    <div class="ptitle"><span class="bang">!</span><h2>${esc(titulo)}</h2></div>
    <div class="stack center">${corpoHtml}</div>
    <button class="btn primary block" data-close style="margin-top:14px">${esc(botao)}</button>`, { sys: true, onClose });
}

export function confirmBox(titulo, texto, sim = "Confirmar") {
  return new Promise(resolve => {
    const o = modal(`
      <div class="ptitle"><h2>${esc(titulo)}</h2></div>
      <p>${esc(texto)}</p>
      <div class="row"><button class="btn ghost grow" data-close>Cancelar</button>
      <button class="btn primary grow" id="cf-yes">${esc(sim)}</button></div>`, { onClose: () => resolve(false) });
    $("#cf-yes", o).onclick = () => { o.remove(); resolve(true); };
  });
}

// Mostra os eventos de XP/Ouro (vindos de game.grant) como notificação
export function showEvents(titulo, events, extra = "") {
  if (!events.length) return;
  const linhas = events.map(e => {
    const parts = [];
    if (e.xp) parts.push(`<b class="${e.xp > 0 ? "ok" : "bad"}">${e.xp > 0 ? "+" : ""}${e.xp} XP</b>`);
    if (e.gold) parts.push(`<b class="${e.gold > 0 ? "gold" : "bad"}">${e.gold > 0 ? "+" : ""}${e.gold} Ouro</b>`);
    return `<li><span class="grow" style="text-align:left">${esc(e.motivo)}</span><span class="num">${parts.join(" ")}</span></li>`;
  }).join("");
  const up = events.filter(e => e.levelUp).pop(), down = events.filter(e => e.levelDown).pop();
  const lvl = up ? `<p class="mid glow">SUBIU DE NÍVEL! Nível ${up.levelUp}</p>`
    : down ? `<p class="mid bad">Você caiu para o nível ${down.levelDown}</p>` : "";
  sysMessage(titulo, `${lvl}<ul class="list">${linhas}</ul>${extra}`);
}

export function header() {
  const li = levelInfo(), g = S.game;
  return `<header class="topbar">
    <div class="rank" title="Rank ${li.rank}"><span>${li.rank}</span></div>
    <div class="grow">
      <div class="row between"><h1>${esc(S.profile?.nome || "Jogador")}</h1><span class="gold num" title="Ouro">◆ ${fmt(g.gold)}</span></div>
      <div class="row between small muted"><span>Nível <b class="glow">${li.level}</b></span><span class="num">${fmt(li.into)} / ${fmt(li.need)} XP</span></div>
      <div class="xpbar" role="progressbar" aria-valuenow="${Math.round(li.pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${li.pct}%"></i></div>
    </div></header>`;
}

export const panel = (titulo, body, cls = "", right = "") =>
  `<section class="panel ${cls}"><div class="ptitle"><h2>${esc(titulo)}</h2>${right}</div>${body}</section>`;
