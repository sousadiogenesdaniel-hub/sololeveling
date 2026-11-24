// Arsenal: a coleção de armas, livros de invocação, anéis e o Manto (por classe; hoje, o Necromante).
// Itens não obtidos aparecem como silhueta "???" com a raridade; tocar num obtido abre a ficha, e tocar no desenho
// da ficha toca a animação e o som dele. Aqui também ficam o HP do Manto e o dia de folga.
import { views, actions, refresh } from "../core.js";
import { S, save } from "../store.js";
import { esc, fmtDate, today, $ } from "../util.js";
import { header, panel, toast, modal, confirmBox, showEvents } from "../ui.js";
import { playItem } from "../fx.js";
import { arteItem } from "../arte-itens.js";
import { RAR, SLOTS, ITENS, itemBase, possui, registroItem, equipados, equipar, efeitoTxt, ondeCai, temHp, HP, podeFolga, usarFolga, arsenalMarechal } from "../premios.js";
import { necromante } from "../sombras.js";
import { NOMEADOS, nomeados, NOM } from "../portoes.js";
import { botaoCompartilhar } from "../cartao.js";

const RANKS = [["D", "#3dffb5"], ["C", "#3fb8ff"], ["B", "#9257ff"], ["A", "#ff2e4d"], ["S", "#f0c45c"]];

function hpPanel() {
  if (!temHp()) return "";
  const pf = podeFolga(), hoje = (S.folgas || []).includes(today());
  return panel("HP do Manto", `<div class="row between"><b class="hpv num" style="font-size:1.4rem">${S.hp} / ${HP.max}</b>
      <span class="small muted">${(S.folgas || []).length} folga${(S.folgas || []).length === 1 ? "" : "s"} usada${(S.folgas || []).length === 1 ? "" : "s"}</span></div>
    <div class="hpbar" style="margin:8px 0"><i style="width:${S.hp / HP.max * 100}%"></i></div>
    <p class="small muted" style="margin:0">+1 HP por missão cumprida, por Dungeon vencida e por dia de atividades com 250 kcal (+2 acima de 700). Uma falta tira 25.
      Com ${HP.folga} HP, troque por um <b>dia de folga</b>: sem missão e sem penalidade, só no próprio dia e antes de cumprir a missão.</p>
    ${pf.ok ? `<button class="btn primary block" style="margin-top:10px" data-act="usarFolga">Usar o dia de folga hoje (−${HP.folga} HP)</button>`
      : hoje ? `<p class="ok small" style="margin-bottom:0">Hoje é o seu dia de folga.</p>` : ""}`);
}

function resumo() {
  const eq = equipados(), n = ITENS.filter(i => possui(i.id)).length, m = arsenalMarechal();
  return panel(necromante() ? "Arsenal do Necromante" : "Arsenal", `<p style="margin-top:0">${necromante()
      ? `<b class="glow">${n}</b> de ${ITENS.length} itens. Cada um tem história, poder e animação própria.`
      : "Os itens são da classe: o Arsenal abre quando você vira Necromante, no rank D. Até lá, tudo fica em silhueta."}</p>
    <ul class="list small">${Object.entries(SLOTS).map(([k, nome]) => { const b = eq[k] && itemBase(eq[k]);
      return `<li><span class="muted" style="width:4.5em">${nome}</span><span class="grow">${b ? `<b style="color:${RAR[b.rar].cor}">${esc(b.nome)}</b><br><span class="muted">${efeitoTxt(b)}</span>` : `<span class="muted">vazio</span>`}</span></li>`; }).join("")}</ul>
    <p class="small muted" style="margin-bottom:0">Caem das Dungeons (nunca repetido); os 2 Lendários, só das Dungeons do Inferno e do Trono.
      O Marechal só se levanta com os 6 livros e o Manto: você tem <b>${m.livros}/6 livros</b>${m.manto ? " e o Manto" : ""}.</p>`);
}

function grade() {
  return RANKS.map(([r, cor]) => {
    const lista = ITENS.filter(i => i.rank === r);
    return `<div class="ars-rank"><span class="lt" style="color:${cor}"><b>${r}</b></span>Rank ${r}<small>${lista.filter(i => possui(i.id)).length}/${lista.length}</small></div>
      <div class="ars-grade">${lista.map(it => {
        const tem = possui(it.id), R = RAR[it.rar], eq = Object.values(equipados()).includes(it.id);
        return `<button type="button" class="ars-item ${tem ? "" : "bloq"} ${eq ? "equip" : ""}" style="--r:${R.cor}" ${tem ? `data-act="fichaItem" data-id="${it.id}"` : 'aria-disabled="true"'}>
          ${eq ? `<span class="eq">EQUIPADO</span>` : ""}${arteItem(it, { tam: 84, bloq: !tem })}
          <span class="nm">${tem ? esc(it.nome) : "???"}</span><span class="tp">${tem ? SLOTS[it.slot] + " · " : ""}${R.nome}</span></button>`;
      }).join("")}</div>`;
  }).join("");
}

function nomeadosPanel() {
  const ativos = Object.entries(NOMEADOS).filter(([k]) => nomeados()[k]);
  if (!ativos.length) return "";
  const st = { espera: "Vai abrir sem aviso", aberto: "Aberto: escolha o dia", marcado: "Dia marcado", ativo: "Em andamento", vencido: "Vencido", esgotado: "Chances esgotadas" };
  return panel("Dungeons nomeadas", `<ul class="list small">${ativos.map(([k, N]) => { const g = nomeados()[k];
    return `<li><span class="grow"><b style="color:${N.cor}">${N.nome}</b><br><span class="muted">${st[g.status]}${g.status === "marcado" ? ` · ${fmtDate(g.dia)}` : ""}
      ${g.status !== "vencido" ? ` · chance ${Math.min(g.usadas + 1, NOM.chances)} de ${NOM.chances} no rank ${g.fase}` : ""}</span></span>
      <a class="btn sm" href="#/portao">Ver</a></li>`; }).join("")}</ul>`);
}

views.arsenal = () => `${header()}<div class="stack">${resumo()}${hpPanel()}${nomeadosPanel()}${panel("Coleção", grade())}</div>`;

// ---- ficha do item ---------------------------------------------------------------------------
actions.fichaItem = ({ id }) => {
  const it = itemBase(id), reg = registroItem(id); if (!it || !reg) return;
  const R = RAR[it.rar], eq = equipados()[it.slot] === id;
  const o = modal(`<div class="ars-ficha" style="--r:${R.cor}">
    <div class="row between"><span class="raro-chip" style="color:${R.cor}">${R.nome}</span><button class="btn sm ghost" data-close>Fechar</button></div>
    <div class="ars-palco" id="ars-palco" role="button" tabindex="0" aria-label="Tocar a animação" style="--c:${it.cor}">${arteItem(it, { tam: 220 })}</div>
    <p class="center small muted" style="margin:0">Toque no desenho</p>
    <h3>${esc(it.nome)}</h3><p class="center small muted" style="margin:2px 0 0;letter-spacing:.12em;text-transform:uppercase">${SLOTS[it.slot]} · rank ${it.rank}</p>
    <dl><div><dt>Poder</dt><dd>${efeitoTxt(it)}</dd></div>
      <div><dt>Onde cai</dt><dd>${ondeCai(it)}</dd></div>
      <div><dt>Quando você conseguiu</dt><dd>${esc(reg.motivo || "—")} em ${fmtDate(reg.d)}${reg.nivel ? `, no nível ${reg.nivel}` : ""}${reg.rank ? `, rank ${reg.rank}` : ""}.</dd></div>
      <div><dt>História</dt><dd class="hist">${esc(it.hist)}</dd></div></dl>
    ${eq ? `<p class="center ok small" style="margin:12px 0 0">Equipado</p>` : `<button class="btn primary block" style="margin-top:12px" data-act="equiparItem" data-id="${id}">Equipar (${SLOTS[it.slot].toLowerCase()})</button>`}
    ${botaoCompartilhar("item", { nome: it.nome, rar: it.rar, tipo: SLOTS[it.slot], arte: arteItem(it, { tam: 400 }) }, "Compartilhar")}</div>`);
  const palco = $("#ars-palco", o);
  palco.onclick = () => tocar(it, palco);
  palco.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tocar(it, palco); } };
};

function tocar(it, palco) {
  const svg = palco.querySelector("svg"), cls = "toca-" + it.slot, lend = it.rar === "lendario";
  svg.classList.remove(cls, "toca-lendario"); void svg.getBoundingClientRect(); svg.classList.add(cls); if (lend) svg.classList.add("toca-lendario");
  palco.querySelectorAll(".ars-fx").forEach(n => n.remove());
  const c = document.createElement("div"); c.className = "ars-fx"; c.style.setProperty("--c", it.cor);
  if (it.slot === "arma") c.innerHTML = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;overflow:visible"><path class="ars-corte" d="M14 70C30 30 62 18 90 26" stroke="${it.cor}" style="filter:drop-shadow(0 0 4px ${it.cor})"/></svg>`;
  if (it.slot === "anel") c.innerHTML = `<span class="ars-onda"></span><span class="ars-onda" style="animation-delay:.25s"></span>`;
  if (it.slot === "livro") c.innerHTML = Array.from({ length: 9 }, (_, i) => `<span class="ars-faisca" style="left:${22 + i * 7}%;top:${42 + (i % 3) * 8}%;animation-delay:${(i % 4) * .12}s"></span>`).join("");
  if (it.slot === "manto") c.innerHTML = `<span class="ars-fumaca" style="left:8%"></span><span class="ars-fumaca" style="left:33%;animation-delay:.15s"></span><span class="ars-fumaca" style="left:58%;animation-delay:.3s"></span>`;
  palco.append(c);
  if (lend) { const f = document.createElement("div"); f.className = "ars-clarao"; document.body.append(f); setTimeout(() => f.remove(), 1000); }
  playItem(it, ITENS.indexOf(it));
  navigator.vibrate?.(lend ? [60, 40, 160] : 40);
  setTimeout(() => c.remove(), 1600);
}

actions.equiparItem = ({ id }) => {
  equipar(id); save(); refresh();
  const it = itemBase(id); toast(`${it.nome} equipado: ${efeitoTxt(it)}.`, 3500);
  actions.fichaItem({ id });
};

actions.usarFolga = async () => {
  if (!await confirmBox("Usar o dia de folga", `Hoje fica sem missão e sem penalidade. Gasta ${HP.folga} HP.`, "Usar a folga")) return;
  const ev = usarFolga(); if (!ev) return toast(podeFolga().motivo);
  save(); refresh();
  showEvents("Dia de folga", [ev], `<p class="small muted">Descanse de verdade: amanhã a missão volta.</p>`);
};
