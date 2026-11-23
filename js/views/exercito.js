// Tela do Exército das Sombras (Necromante). O equipamento fica no Arsenal.
import { views, actions, refresh } from "../core.js";
import { S, save } from "../store.js";
import { esc, fmt, fmtDate, addDays, today } from "../util.js";
import { header, panel, toast, confirmBox, aviso, modal } from "../ui.js";
import { extracaoFx, falhaFx } from "../fx.js";
import { weekStart, levelInfo, RANK_ORDER } from "../game.js";
import { RAR, SLOTS, itemBase, equipados, efeitoTxt, bonus, arsenalMarechal } from "../premios.js";
import { necromante, precisaEscolherClasse, classeAtual, sombras, corpos, GRAU, COMANDANTES, arteSombra, nomeSombra, nivelSombra, poderSombra,
  poderTotal, levantar, chanceExtracao, invocar, podeInvocar, invocouNaSemana, invocacaoHoje, statusMarechal, podeInvocarTodos,
  CATALOGO, catBase, RANKS_REG, destinoCorpo, NIVEL, EVOLUI } from "../sombras.js";
import { checarConquistas } from "../conquistas.js";
import { mostrarTitulos, escolhaDeClasse, listaClasses, mostrarCrescimento } from "./recompensas-ui.js";
import { botaoCompartilhar } from "../cartao.js";

const RANKS = ["D", "C", "B", "A", "S"];
const pct = v => `${Math.round(v * 100)}%`;

function equipamentoPanel() {
  const eq = equipados(), m = arsenalMarechal();
  return panel("Equipamento", `<ul class="list small">${Object.entries(SLOTS).map(([k, nome]) => { const b = eq[k] && itemBase(eq[k]);
      return `<li><span class="muted" style="width:4.5em">${nome}</span><span class="grow">${b ? `<b style="color:${RAR[b.rar].cor}">${esc(b.nome)}</b> · <span class="muted">${efeitoTxt(b)}</span>` : `<span class="muted">vazio</span>`}</span></li>`; }).join("")}</ul>
    <p class="small muted">Livros no Arsenal: <b>${m.livros}/6</b>${m.manto ? " · Manto ✓" : ""}. O Marechal só se levanta com os 6 livros e o Manto.</p>
    <a class="btn block" href="#/arsenal">Abrir o Arsenal</a>`);
}

function bloqueado() {
  const n = corpos().length;
  return `${panel("Exército das Sombras", `<div class="row" style="align-items:flex-start">${arteSombra({ grau: "comandante" }, { tam: 90, bloqueado: true })}
    <div class="grow"><p style="margin-top:0">Você ainda é <b>Humano</b>. Ao vencer o chefe do rank <b>D</b>, o Sistema libera a <b>mudança de classe</b>. Como <b>Necromante</b>, você forma este exército.</p>
    <p class="small">Seus feitos já estão guardando corpos: <b class="glow">${n}</b> esperando a extração.</p></div></div>
    ${precisaEscolherClasse() ? `<button class="btn primary block" data-act="abrirClasse">Escolher a classe</button>` : ""}
    <p class="small muted" style="margin-bottom:0">Cada recorde pessoal, marco (1.000 flexões, 100 km…), Portão vencido e chefe de Teste de Rank deixa um corpo. O chefe do rank D vira o seu primeiro Comandante. Com a classe vem também o Arsenal.</p>`)}
    ${panel("Classes do rank D", `${listaClasses()}<p class="small muted" style="margin-bottom:0">As classes em construção chegam em atualizações futuras, cada uma com a sua coleção.</p>`)}`;
}

function exercitoPanel() {
  const ss = sombras(), b = bonus();
  const cont = g => ss.filter(s => s.grau === g).length;
  return panel(`${classeAtual().nome}`, `<div class="row between"><div><div class="small muted">Poder total do exército</div><div class="big glow num">${fmt(poderTotal())}</div><div class="small">Registro: <b>${ss.filter(x => x.cat).length}/100</b></div></div>
      <div class="small" style="text-align:right">${["comandante", "cavaleiro", "elite", "soldado"].map(g => `${GRAU[g].nome}s: <b>${cont(g) + (g === "comandante" ? cont("marechal") : 0)}</b>`).join("<br>")}</div></div>
    <p class="small muted" style="margin-bottom:0">Por missão: <b class="gold">+${b.ouroSombras} Ouro</b> do exército (Soldado +1, Cavaleiro +3, até +40) · sorte no baú <b>+${b.sorteSombras}%</b> (Elite +1%, até +10%).
      ${S.cinzas ? `<br>${S.cinzas} corpo${S.cinzas > 1 ? "s viraram" : " virou"} cinzas.` : ""} Cada sombra sobe 1 nível a cada 10 missões. Soldado vira Elite no nível ${EVOLUI.elite.nivel} (com você no rank ${EVOLUI.elite.rank} ou acima); Elite vira Cavaleiro no ${EVOLUI.cavaleiro.nivel} (rank ${EVOLUI.cavaleiro.rank} ou acima).</p>`);
}

function invocacaoPanel() {
  const meus = RANKS.filter(r => sombras().some(s => s.cmd === r));
  if (!meus.length) return "";
  const hoje = invocacaoHoje(), usada = invocouNaSemana();
  return panel("Invocação", `${hoje ? `<p class="ok" style="margin-top:0">Hoje: ${hoje.cmd === "todos" ? `<b>todos os seus Comandantes</b> estão com você (Anel do Domínio)` : `<b>${COMANDANTES[hoje.cmd].nome}</b> está com você · ${COMANDANTES[hoje.cmd].efeito}`}.</p>`
      : usada ? `<p class="muted" style="margin-top:0">Invocação desta semana já usada. Volta em ${fmtDate(addDays(weekStart(), 7))}.</p>`
      : `<p style="margin-top:0">Uma invocação por semana: o Comandante empresta o poder dele por um dia.</p>`}
    <ul class="list">${meus.map(r => { const k = COMANDANTES[r];
      return `<li><span class="grow"><b style="color:${k.cor}">${k.nome}</b> · ${k.poder}<br><span class="small muted">${k.efeito}</span></span>
        <button class="btn sm ${podeInvocar(r) ? "primary" : "ghost"}" data-act="invocar" data-r="${r}" ${podeInvocar(r) ? "" : "disabled"}>Invocar</button></li>`; }).join("")}</ul>
    ${podeInvocarTodos() ? `<button class="btn primary block" style="margin-top:8px" data-act="invocar" data-r="todos">Invocar todos (Anel do Domínio)</button>` : ""}
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
  const linha = c => {
    if (c.grau !== "marechal") return c.grau === "comandante" ? "extração garantida" : `${pct(chanceExtracao(c))} por tentativa · ${c.tentativas} tentativa${c.tentativas > 1 ? "s" : ""}`;
    const st = statusMarechal(c);
    return st.bloqueado ? `precisa dos 6 livros e do Manto no Arsenal (${st.livros}/6 livros${st.manto ? ", Manto ✓" : ""})`
      : st.espera ? `recuou para as sombras · nova tentativa em ${fmtDate(st.espera)}` : `${pct(st.chance)} de chance · nunca vira cinzas`;
  };
  const pode = c => c.grau !== "marechal" || statusMarechal(c).ok;
  return panel("Corpos esperando", `<ul class="list">${cs.map(c => {
    const nome = c.cmd ? `Chefe do rank ${c.cmd}` : c.qtd ? `Esquadrão de ${c.qtd} Soldados` : GRAU[c.grau].nome, absorve = destinoCorpo(c) === "absorver";
    return `<li><span style="width:46px;flex:none">${arteSombra(c.cmd ? { grau: c.grau, cmd: c.cmd } : { grau: c.grau }, { tam: 46, bloqueado: true })}</span>
      <span class="grow"><b>${nome}</b><br><span class="small muted">${esc(c.origem)} · ${absorve
        ? `sem ${GRAU[c.grau].nome} livre no Registro para o seu rank: o exército absorve o corpo (+${NIVEL.absorver * (c.qtd || 1)} XP para cada sombra)` : linha(c)}</span></span>
      <button class="btn sm ${pode(c) ? "primary" : "ghost"}" data-act="levantar" data-id="${c.id}" ${pode(c) ? "" : "disabled"}>${absorve ? "Absorver" : "Levante-se"}</button></li>`;
  }).join("")}</ul>`, "", `<span class="chip">${cs.reduce((n, c) => n + (c.qtd || 1), 0)}</span>`);
}

// Registro das Sombras: as 100, por rank; as que faltam aparecem como silhueta "???" do grau de nascimento
const REG_COR = { D: "#3dffb5", C: "#3fb8ff", B: "#9257ff", A: "#ff2e4d", S: "#f0c45c" };
function registroPanel() {
  const minhas = new Map(sombras().map(s => [s.cat, s])), meu = RANK_ORDER.indexOf(levelInfo().rank);
  const blocos = RANKS_REG.map(r => {
    const lista = CATALOGO.filter(c => c.rank === r), fechado = RANK_ORDER.indexOf(r) > meu; // ranks ainda não alcançados ficam recolhidos
    const titulo = `<span class="lt" style="color:${REG_COR[r]}"><b>${r}</b></span>Rank ${r}<small>${lista.filter(c => minhas.has(c.id)).length}/${lista.length}${fechado ? ` · libera no rank ${r}` : ""}</small>`;
    return `${fechado ? `<details class="reg-det"><summary class="ars-rank">${titulo}</summary>` : `<div class="ars-rank">${titulo}</div>`}
      <div class="reg-grade">${lista.map(c => { const s = minhas.get(c.id);
        return s ? `<button type="button" class="reg-item" data-act="fichaSombra" data-id="${s.id}" style="--r:${s.cmd ? COMANDANTES[s.cmd].cor : GRAU[s.grau].cor}">
            <span class="num">#${String(c.n).padStart(3, "0")}</span>${arteSombra(s, { tam: 54 })}<span class="nm">${esc(s.cmd ? s.nome : s.nome)}</span><span class="nv">${s.cmd ? GRAU[s.grau].nome : `${GRAU[s.grau].nome} · Nv ${nivelSombra(s)}`}</span></button>`
          : `<div class="reg-item bloq"><span class="num">#${String(c.n).padStart(3, "0")}</span>${arteSombra({ grau: c.grau }, { tam: 54, bloqueado: true })}<span class="nm">???</span><span class="nv">${GRAU[c.grau].nome}</span></div>`;
      }).join("")}</div>${fechado ? "</details>" : ""}`;
  }).join("");
  return panel("Registro das Sombras", `<p class="small muted" style="margin-top:0">As 100 sombras do Necromante. As de cada rank só se levantam com você naquele rank ou acima: o Registro fecha no S.</p>${blocos}`,
    "", `<span class="chip">${minhas.size}/100</span>`);
}

actions.fichaSombra = ({ id }) => {
  const s = sombras().find(x => x.id === id); if (!s) return;
  const c = catBase(s.cat), cor = s.cmd ? COMANDANTES[s.cmd].cor : GRAU[s.grau].cor, n = nivelSombra(s);
  const prox = s.grau === "soldado" ? "elite" : s.grau === "elite" ? "cavaleiro" : null;
  const faltaXp = n >= NIVEL.max ? 0 : n * NIVEL.porNivel - (s.xp || 0);
  modal(`<div class="row between"><span class="raro-chip" style="color:${cor}">${c ? "#" + String(c.n).padStart(3, "0") : ""} · ${GRAU[s.grau].nome}</span><button class="btn sm ghost" data-close>Fechar</button></div>
    <div style="display:grid;place-items:center;margin:6px 0">${arteSombra(s, { tam: 170 })}</div>
    <h3 class="center" style="margin:0;color:${cor};text-transform:none">${esc(nomeSombra(s))}</h3>
    <ul class="list small" style="margin-top:10px">
      ${s.cmd ? `<li><span class="grow">Poder</span><b>${COMANDANTES[s.cmd].poder}</b></li><li><span class="grow muted">${COMANDANTES[s.cmd].efeito}</span></li>`
        : `<li><span class="grow">Nível</span><b class="num">${n}${n < NIVEL.max ? ` · faltam ${faltaXp} XP (${Math.ceil(faltaXp / NIVEL.xpMissao)} missões)` : " (máximo)"}</b></li>
        ${prox ? `<li><span class="grow">Evolui para ${GRAU[prox].nome}</span><b>no nível ${EVOLUI[prox].nivel}, com você no rank ${EVOLUI[prox].rank}+</b></li>` : ""}
        ${c && c.grau !== s.grau ? `<li><span class="grow">Nasceu</span><b>${GRAU[c.grau].nome}</b></li>` : ""}`}
      <li><span class="grow">Poder de combate</span><b class="num">${fmt(poderSombra(s))}</b></li>
      <li><span class="grow">Origem</span><span class="muted">${esc(s.origem || "—")}</span></li>
      <li><span class="grow">Extraída em</span><span class="muted">${s.d ? fmtDate(s.d) : "—"}</span></li></ul>
    ${botaoCompartilhar("sombra", { nome: nomeSombra(s), grau: GRAU[s.grau].nome, cor, arte: arteSombra(s, { tam: 200 }) }, "Compartilhar")}`);
};

views.exercito = () => `${header()}<div class="stack">
  ${necromante() ? `${exercitoPanel()}${corposPanel()}${invocacaoPanel()}${comandantesPanel()}${registroPanel()}` : bloqueado()}
  ${necromante() ? equipamentoPanel() : ""}</div>`;

actions.abrirClasse = () => escolhaDeClasse();

actions.levantar = async ({ id }) => {
  const r = levantar(id); if (!r) return;
  save();
  if (r.marechal && !r.ok) {
    if (r.bloqueado) return aviso("O Marechal não responde", `<p>Ele só se levanta para quem tem os <b>6 livros de invocação</b> e o <b>Manto</b> no Arsenal.</p><p class="small muted">Você tem ${r.livros}/6 livros${r.manto ? " e o Manto" : ""}.</p>`);
    if (r.espera) return toast(`O Marechal recuou para as sombras. Nova tentativa em ${fmtDate(r.espera)}.`, 3500);
    await falhaFx("O MARECHAL RECUOU", `Nova tentativa em ${fmtDate(r.volta)} · a chance sobe a cada vez`);
    return refresh();
  }
  if (r.absorvido) {
    await aviso("Corpo absorvido", `<p>Não há ${GRAU[r.corpo.grau].nome} livre no Registro para o seu rank. O exército absorveu ${r.corpo.qtd ? `o esquadrão` : "o corpo"}: <b>+${NIVEL.absorver * (r.corpo.qtd || 1)} XP</b> para cada sombra.</p>`);
    await mostrarCrescimento(r.niveis, r.evolucoes); save();
    return refresh();
  }
  if (r.esquadrao) {
    for (const s of r.novas) await extracaoFx({ grau: s.grau, arte: arteSombra(s, { tam: 300 }), nome: esc(nomeSombra(s)), cor: GRAU[s.grau].cor, sub: `${GRAU[s.grau].nome} · nível 1`, faixa: "" });
    await aviso("Esquadrão", `<ul class="list">${r.novas.map(s => `<li><span class="grow" style="text-align:left">${esc(nomeSombra(s))} se levantou</span></li>`).join("")}
      ${r.falharam ? `<li><span class="grow bad" style="text-align:left">${r.falharam} não se levant${r.falharam > 1 ? "aram" : "ou"}: ${r.restantes} tentativa${r.restantes > 1 ? "s" : ""} restante${r.restantes > 1 ? "s" : ""}</span></li>` : ""}
      ${r.perdidos ? `<li><span class="grow bad" style="text-align:left">${r.perdidos} vir${r.perdidos > 1 ? "aram" : "ou"} cinzas</span></li>` : ""}
      ${r.absorvidos ? `<li><span class="grow" style="text-align:left">${r.absorvidos} sem vaga no Registro: absorvido${r.absorvidos > 1 ? "s" : ""} pelo exército</span></li>` : ""}</ul>`);
    if (r.niveis || r.evolucoes) await mostrarCrescimento(r.niveis, r.evolucoes);
    await mostrarTitulos(checarConquistas()); save();
    return refresh();
  }
  if (r.ok) {
    const s = r.sombra, cor = s.cmd ? COMANDANTES[s.cmd].cor : GRAU[s.grau].cor, c = catBase(s.cat);
    await extracaoFx({ grau: s.grau, arte: arteSombra(s, { tam: 300 }), nome: esc(nomeSombra(s)), cor,
      sub: s.cmd ? COMANDANTES[s.cmd].poder : `${GRAU[s.grau].nome} · nível 1${c ? ` · #${String(c.n).padStart(3, "0")}` : ""}`, faixa: s.cmd ? GRAU[s.grau].nome.toUpperCase() : "" });
    if (s.cmd) await aviso("Comandante extraído", `<p class="mid" style="color:${cor}">${esc(s.nome)}</p><p>${COMANDANTES[s.cmd].poder}: ${COMANDANTES[s.cmd].efeito}.</p>
      <p class="small muted">Invoque uma vez por semana na tela do Exército.</p>${botaoCompartilhar("sombra", { nome: s.nome, grau: GRAU[s.grau].nome, cor, arte: arteSombra(s, { tam: 200 }) })}`);
  } else if (r.cinzas) await falhaFx("A SOMBRA VIROU CINZAS", esc(r.corpo.origem));
  else await falhaFx("A EXTRAÇÃO FALHOU", `${r.restantes} tentativa${r.restantes > 1 ? "s" : ""} restante${r.restantes > 1 ? "s" : ""}`);
  await mostrarTitulos(checarConquistas()); save();
  refresh();
};

actions.invocar = async ({ r }) => {
  const todos = r === "todos", k = todos ? null : COMANDANTES[r];
  const txt = todos ? `Os poderes de ${sombras().filter(s => s.cmd).map(s => COMANDANTES[s.cmd].nome).join(", ")} valem hoje. Uma invocação por semana.` : `${k.poder}: ${k.efeito}. Uma invocação por semana.`;
  if (!await confirmBox(todos ? "Invocar todos os Comandantes" : `Invocar ${k.nome}`, txt, "Invocar")) return;
  if (!invocar(r)) return toast("Não dá para invocar agora.");
  save();
  const s = todos ? sombras().filter(x => x.cmd).sort((a, b) => poderSombra(b) - poderSombra(a))[0] : sombras().find(x => x.cmd === r);
  await extracaoFx({ grau: s.grau, arte: arteSombra(s, { tam: 300 }), nome: todos ? "TODOS OS COMANDANTES" : esc(k.nome), sub: todos ? "Anel do Domínio" : k.poder,
    cor: todos ? "#ffc94d" : k.cor, faixa: "INVOCAÇÃO", palavra: "INVOCAÇÃO" });
  refresh();
};
