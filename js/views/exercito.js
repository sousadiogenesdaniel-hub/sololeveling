// Tela do Exército das Sombras (Necromante) e dos Equipamentos.
import { views, actions, refresh } from "../core.js";
import { S, save } from "../store.js";
import { esc, fmt, fmtDate, addDays, today } from "../util.js";
import { header, panel, toast, confirmBox, aviso } from "../ui.js";
import { levantarFx, falhaFx } from "../fx.js";
import { weekStart } from "../game.js";
import { RAR, SLOTS, ITENS, itemBase, inventario, equipados, equipar, efeitoTxt, bonus } from "../premios.js";
import { necromante, precisaEscolherClasse, classeAtual, sombras, corpos, GRAU, COMANDANTES, arteSombra, nomeSombra, nivelSombra, poderSombra,
  poderTotal, levantar, chanceExtracao, invocar, podeInvocar, invocouNaSemana, invocacaoHoje } from "../sombras.js";
import { checarConquistas } from "../conquistas.js";
import { mostrarTitulos, escolhaDeClasse, listaClasses } from "./recompensas-ui.js";
import { botaoCompartilhar } from "../cartao.js";

const RANKS = ["D", "C", "B", "A", "S"];
const pct = v => `${Math.round(v * 100)}%`;

function equipamentoPanel() {
  const eq = equipados(), inv = inventario();
  const slot = ([k, nome]) => {
    const b = eq[k] && itemBase(eq[k]);
    return `<li><span class="small muted" style="width:5.5em">${nome}</span><span class="grow">${b ? `<b style="color:${RAR[b.rar].cor}">${esc(b.nome)}</b><br><span class="small muted">${efeitoTxt(b.ef)}</span>` : `<span class="muted">vazio</span>`}</span></li>`;
  };
  const outros = inv.map(i => itemBase(i.base)).filter(b => b && eq[b.slot] !== b.id);
  return panel("Equipamento", `<ul class="list">${Object.entries(SLOTS).map(slot).join("")}</ul>
    ${outros.length ? `<h3 style="margin-top:10px">Inventário</h3><ul class="list">${outros.map(b => `<li><span class="grow"><b style="color:${RAR[b.rar].cor}">${esc(b.nome)}</b>
      <span class="raro-chip" style="color:${RAR[b.rar].cor}">${RAR[b.rar].nome}</span><br><span class="small muted">${SLOTS[b.slot]} · ${efeitoTxt(b.ef)}</span></span>
      <button class="btn sm" data-act="equipar" data-id="${b.id}">Equipar</button></li>`).join("")}</ul>` : ""}
    <p class="small muted" style="margin-bottom:0">Equipamentos caem de baús Épicos e Lendários, dos Portões e dos chefes dos Testes de Rank (${inv.length} de ${ITENS.length} encontrados). Repetido vira Ouro.</p>`);
}

function bloqueado() {
  const n = corpos().length;
  return `${panel("Exército das Sombras", `<div class="row" style="align-items:flex-start">${arteSombra({ grau: "comandante" }, { tam: 90, bloqueado: true })}
    <div class="grow"><p style="margin-top:0">Você ainda é <b>Humano</b>. Ao vencer o chefe do rank <b>D</b>, o Sistema libera a <b>mudança de classe</b>. Como <b>Necromante</b>, você forma este exército.</p>
    <p class="small">Seus feitos já estão guardando corpos: <b class="glow">${n}</b> esperando a extração.</p></div></div>
    ${precisaEscolherClasse() ? `<button class="btn primary block" data-act="abrirClasse">Escolher a classe</button>` : ""}
    <p class="small muted" style="margin-bottom:0">Cada recorde pessoal, marco (1.000 flexões, 100 km…), Portão vencido e chefe de Teste de Rank deixa um corpo. O chefe do rank D vira o seu primeiro Comandante.</p>`)}
    ${panel("Classes do rank D", `${listaClasses()}<p class="small muted" style="margin-bottom:0">As classes em construção chegam em atualizações futuras, cada uma com a sua coleção.</p>`)}`;
}

function exercitoPanel() {
  const ss = sombras(), b = bonus();
  const cont = g => ss.filter(s => s.grau === g).length;
  return panel(`${classeAtual().nome}`, `<div class="row between"><div><div class="small muted">Poder total do exército</div><div class="big glow num">${fmt(poderTotal())}</div></div>
      <div class="small" style="text-align:right">${["comandante", "cavaleiro", "elite", "soldado"].map(g => `${GRAU[g].nome}s: <b>${cont(g) + (g === "comandante" ? cont("marechal") : 0)}</b>`).join("<br>")}</div></div>
    <p class="small muted" style="margin-bottom:0">Por missão: <b class="gold">+${b.ouroSombras} Ouro</b> do exército (Soldado +1, Cavaleiro +3, até +40) · sorte no baú <b>+${b.sorteSombras}%</b> (Elite +1%, até +10%).
      ${S.cinzas ? `<br>${S.cinzas} sombra${S.cinzas > 1 ? "s viraram" : " virou"} cinzas.` : ""} As sombras ganham experiência a cada missão: Soldado vira Elite no nível 10, Elite vira Cavaleiro no 20.</p>`);
}

function invocacaoPanel() {
  const meus = RANKS.filter(r => sombras().some(s => s.cmd === r));
  if (!meus.length) return "";
  const hoje = invocacaoHoje(), usada = invocouNaSemana();
  return panel("Invocação", `${hoje ? `<p class="ok" style="margin-top:0">Hoje: <b>${COMANDANTES[hoje.cmd].nome}</b> está com você · ${COMANDANTES[hoje.cmd].efeito}.</p>`
      : usada ? `<p class="muted" style="margin-top:0">Invocação desta semana já usada. Volta em ${fmtDate(addDays(weekStart(), 7))}.</p>`
      : `<p style="margin-top:0">Uma invocação por semana: o Comandante empresta o poder dele por um dia.</p>`}
    <ul class="list">${meus.map(r => { const k = COMANDANTES[r];
      return `<li><span class="grow"><b style="color:${k.cor}">${k.nome}</b> · ${k.poder}<br><span class="small muted">${k.efeito}</span></span>
        <button class="btn sm ${podeInvocar(r) ? "primary" : "ghost"}" data-act="invocar" data-r="${r}" ${podeInvocar(r) ? "" : "disabled"}>Invocar</button></li>`; }).join("")}</ul>
    ${!usada && meus.some(r => COMANDANTES[r].missao) && S.days[today()]?.workout?.done ? `<p class="small muted" style="margin-bottom:0">Os poderes da missão valem para a missão do dia: invoque antes de concluir.</p>` : ""}`);
}

function comandantesPanel() {
  return panel("Comandantes", `${RANKS.map(r => {
    const s = sombras().find(x => x.cmd === r), k = COMANDANTES[r];
    if (!s) return `<div class="cmd" style="margin-bottom:10px">${arteSombra({ grau: k.grau || "comandante" }, { tam: 70, bloqueado: true })}
      <div class="grow"><b class="muted">???</b><br><span class="small muted">Chefe do Teste do rank ${r}</span></div></div>`;
    return `<div class="cmd" style="margin-bottom:10px">${arteSombra(s, { tam: 88 })}<div class="grow"><b style="color:${k.cor}">${esc(s.nome)}</b>
      <span class="raro-chip" style="color:${k.cor}">${GRAU[s.grau].nome}</span><br>
      <span class="small">Nível ${nivelSombra(s)} · poder ${fmt(poderSombra(s))}</span><br><span class="small muted">${k.poder}: ${k.efeito}</span>
      ${botaoCompartilhar("sombra", { nome: s.nome, grau: GRAU[s.grau].nome, cor: k.cor, arte: arteSombra(s, { tam: 200 }) }, "Compartilhar")}</div></div>`;
  }).join("")}`);
}

function corposPanel() {
  const cs = corpos(); if (!cs.length) return "";
  return panel("Corpos esperando", `<ul class="list">${cs.map(c => {
    const nome = c.cmd ? `Chefe do rank ${c.cmd}` : GRAU[c.grau].nome, garantido = c.grau === "comandante" || c.grau === "marechal";
    return `<li><span style="width:46px;flex:none">${arteSombra(c.cmd ? { grau: c.grau, cmd: c.cmd } : { grau: c.grau }, { tam: 46, bloqueado: true })}</span>
      <span class="grow"><b>${nome}</b><br><span class="small muted">${esc(c.origem)} · ${garantido ? "extração garantida" : `${pct(chanceExtracao(c))} por tentativa · ${c.tentativas} tentativa${c.tentativas > 1 ? "s" : ""}`}</span></span>
      <button class="btn sm primary" data-act="levantar" data-id="${c.id}">Levante-se</button></li>`;
  }).join("")}</ul>`, "", `<span class="chip">${cs.length}</span>`);
}

function sombrasPanel() {
  const ss = sombras().filter(s => !s.cmd).sort((a, b) => poderSombra(b) - poderSombra(a));
  if (!ss.length) return panel("Sombras", `<p class="muted" style="margin:0">Nenhuma sombra ainda. Extraia os corpos esperando acima.</p>`);
  return panel("Sombras", `<div class="sombras">${ss.map(s => `<div class="sombra">${arteSombra(s, { tam: 90 })}
    <div class="nm" style="color:${GRAU[s.grau].cor}">${esc(nomeSombra(s))}</div><div class="gr">Nv ${nivelSombra(s)} · ${fmt(poderSombra(s))}</div></div>`).join("")}</div>`,
    "", `<span class="chip">${ss.length}</span>`);
}

views.exercito = () => `${header()}<div class="stack">
  ${necromante() ? `${exercitoPanel()}${corposPanel()}${invocacaoPanel()}${comandantesPanel()}${sombrasPanel()}` : bloqueado()}
  ${equipamentoPanel()}</div>`;

actions.abrirClasse = () => escolhaDeClasse();
actions.equipar = ({ id }) => { equipar(id); save(); refresh(); toast(`${itemBase(id).nome} equipado.`); };

actions.levantar = async ({ id }) => {
  const r = levantar(id); if (!r) return;
  save();
  if (r.ok) {
    const s = r.sombra, cor = s.cmd ? COMANDANTES[s.cmd].cor : GRAU[s.grau].cor;
    await levantarFx(arteSombra(s, { tam: 200 }), esc(nomeSombra(s)), s.cmd ? `${GRAU[s.grau].nome} · ${COMANDANTES[s.cmd].poder}` : GRAU[s.grau].nome, cor);
    if (s.cmd) await aviso("Comandante extraído", `<p class="mid" style="color:${cor}">${esc(s.nome)}</p><p>${COMANDANTES[s.cmd].poder}: ${COMANDANTES[s.cmd].efeito}.</p>
      <p class="small muted">Invoque uma vez por semana na tela do Exército.</p>${botaoCompartilhar("sombra", { nome: s.nome, grau: GRAU[s.grau].nome, cor, arte: arteSombra(s, { tam: 200 }) })}`);
  } else if (r.cinzas) await falhaFx("A SOMBRA VIROU CINZAS", esc(r.corpo.origem));
  else await falhaFx("A EXTRAÇÃO FALHOU", `${r.restantes} tentativa${r.restantes > 1 ? "s" : ""} restante${r.restantes > 1 ? "s" : ""}`);
  await mostrarTitulos(checarConquistas()); save();
  refresh();
};

actions.invocar = async ({ r }) => {
  const k = COMANDANTES[r];
  if (!await confirmBox(`Invocar ${k.nome}`, `${k.poder}: ${k.efeito}. Uma invocação por semana.`, "Invocar")) return;
  if (!invocar(r)) return toast("Não dá para invocar agora.");
  save();
  const s = sombras().find(x => x.cmd === r);
  await levantarFx(arteSombra(s, { tam: 200 }), esc(k.nome), k.poder, k.cor, "INVOCAÇÃO");
  refresh();
};
