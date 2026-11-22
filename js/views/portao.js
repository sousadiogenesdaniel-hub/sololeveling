// Telas do Portão (dungeon da semana) e do Impulso.
import { views, actions, refresh } from "../core.js";
import { S, save } from "../store.js";
import { esc, fmt, fmtDate, today, $ } from "../util.js";
import { header, panel, toast, confirmBox, aviso } from "../ui.js";
import { bauFx, falhaFx, celebrate } from "../fx.js";
import { RAR } from "../premios.js";
import { TIPOS, PENA, portaoAberto, entrarPortao, desistirPortao, concluirPortao, minutos } from "../portoes.js";
import { impulso, novoImpulso, vencerImpulso, IMPULSO } from "../recompensas.js";
import { checarConquistas } from "../conquistas.js";
import { linhaEv, mostrarTitulos } from "./recompensas-ui.js";
import { botaoCompartilhar } from "../cartao.js";
import { bonus } from "../premios.js";

const relogio = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const premiosTxt = { normal: "+100 XP, baú no mínimo Épico, corpo de Elite (às vezes Cavaleiro) e 25% de chance de equipamento",
  vermelho: "+200 XP, baú Épico com mais chance de Lendário, corpo de Cavaleiro e 60% de chance de equipamento Épico ou Lendário",
  emergencia: "+100 XP, baú no mínimo Raro e corpo de Soldado" };

function historico() {
  const lista = Object.values(S.portoes || {}).filter(p => ["vencido", "falhou", "expirou", "ignorado"].includes(p.status)).sort((a, b) => b.ws.localeCompare(a.ws)).slice(0, 8);
  if (!lista.length) return "";
  const st = { vencido: ["ok", "Vencido"], falhou: ["bad", "Falhou"], expirou: ["muted", "Fechou sem você"], ignorado: ["bad", "Ignorado"] };
  return panel("Portões anteriores", `<ul class="list small">${lista.map(p => `<li><span class="num muted">${fmtDate(p.abertoEm || p.ws, { day: "2-digit", month: "2-digit" })}</span>
    <span class="grow">${TIPOS[p.tipo].nome}${p.rank ? ` · rank ${p.rank}` : ""}</span><b class="${st[p.status][0]}">${st[p.status][1]}</b></li>`).join("")}</ul>`);
}

views.portao = () => {
  const p = portaoAberto();
  if (!p) return `${header()}<div class="stack">${panel("Portões", `<p style="margin-top:0">Nenhum Portão aberto agora.</p>
    <p class="small muted" style="margin-bottom:0">Um Portão se abre em algum dia de cada semana, sem aviso, com um desafio calculado pelos seus máximos.
    A maioria é opcional (só prêmio). O <b style="color:${TIPOS.vermelho.cor}">Vermelho</b> é mais difícil e, depois de entrar, não tem volta.
    O <b style="color:${TIPOS.emergencia.cor}">de Emergência</b> é raro e obrigatório: ignorar ou falhar custa ${-PENA.emergencia.xp} XP e ${-PENA.emergencia.ouro} Ouro (sem Zona de Penalidade).</p>`)}${historico()}</div>`;
  const T = TIPOS[p.tipo], estilo = `style="--pc:${T.cor}"`;
  if (p.status === "aberto") {
    return `${header()}<div class="stack">${panel(`${T.nome} · rank ${p.rank}`, `<p style="margin-top:0">Aberto até <b>${fmtDate(p.fecha)}, à meia-noite</b>. O desafio só aparece quando você entra.</p>
      <p class="small">Tempo limite: <b>${p.desafio.limite} min</b> a partir da entrada.</p>
      <p class="small">Prêmios: ${premiosTxt[p.tipo]}.</p>
      ${p.tipo === "vermelho" ? `<p class="small bad">Depois de entrar, não tem volta: sair ou estourar o tempo conta como falha (${PENA.vermelho.xp} XP).</p>` : ""}
      ${p.tipo === "emergencia" ? `<p class="small warn">Obrigatório: ignorar até fechar, ou falhar, custa ${-PENA.emergencia.xp} XP e ${-PENA.emergencia.ouro} Ouro.</p>` : `<p class="small muted">Opcional: se não entrar, ele só fecha.</p>`}
      <p class="small muted">Faça aquecido, com água por perto. Não conta como a missão do dia.</p>
      <button class="btn primary block" data-act="entrarPortao">Entrar no Portão</button>`, "portao")}</div>`.replace('class="panel portao"', `class="panel portao" ${estilo}`);
  }
  const d = p.desafio, feitos = p.feitos || [];
  return `${header()}<div class="stack">${panel(`${T.nome} · ${esc(d.titulo)}`, `<div class="timer num" id="pt-timer" style="color:${T.cor}">00:00</div>
    <p class="center small muted">Limite: ${d.limite} min</p>
    <p>${esc(d.desc)}</p>
    <ul class="list">${d.itens.map((it, i) => `<li><label class="row grow" style="margin:0;text-transform:none;letter-spacing:0;font-size:1rem;color:var(--text)">
      <input type="checkbox" data-chg="marcaPortao" data-i="${i}" ${feitos[i] ? "checked" : ""}>
      <span class="grow">${it.un === "rodada" ? esc(it.nome) : `<b class="num">${fmt(it.alvo)}${it.un === "s" ? " s" : ""}</b> ${esc(it.nome)}`}</span></label></li>`).join("")}</ul>
    <button class="btn primary block" data-act="concluirPortao" style="margin-top:10px">Concluir o Portão</button>
    <button class="btn ghost sm block" data-act="sairPortao" style="margin-top:8px">${p.tipo === "normal" ? "Sair (volta depois, o tempo zera)" : "Desistir (conta como falha)"}</button>`, "portao")}</div>`
    .replace('class="panel portao"', `class="panel portao" ${estilo}`);
};

let tick = null;
views.portao.after = () => {
  clearInterval(tick);
  const el = $("#pt-timer"), p = portaoAberto(); if (!el || !p?.inicio) return;
  const upd = () => {
    if (!el.isConnected) return clearInterval(tick);
    const s = minutos(p) * 60; el.textContent = relogio(s);
    el.classList.toggle("bad", s > p.desafio.limite * 60);
  };
  upd(); tick = setInterval(upd, 1000);
};

actions.entrarPortao = async () => {
  const p = portaoAberto(); if (!p) return;
  if (p.tipo !== "normal" && !await confirmBox(`Entrar: ${TIPOS[p.tipo].nome}`, p.tipo === "vermelho"
    ? `Depois de entrar não tem volta. Você terá ${p.desafio.limite} min. Falhar custa ${-PENA.vermelho.xp} XP.`
    : `Você terá ${p.desafio.limite} min. Falhar custa ${-PENA.emergencia.xp} XP e ${-PENA.emergencia.ouro} Ouro.`, "Entrar")) return;
  entrarPortao(); save(); refresh();
};
actions.marcaPortao = ({ i }, el) => { const p = portaoAberto(); if (!p) return; (p.feitos ||= [])[i] = el.checked; save(); };
actions.sairPortao = async () => {
  const p = portaoAberto(); if (!p) return;
  if (p.tipo !== "normal" && !await confirmBox("Desistir do Portão", "Conta como falha.", "Desistir")) return;
  const r = desistirPortao(); save(); refresh();
  if (r && !r.voltou) await resultado(r, p);
};
actions.concluirPortao = async () => {
  const p = portaoAberto(); if (!p) return;
  const todos = p.desafio.itens.every((_, i) => p.feitos?.[i]);
  if (!todos && !await confirmBox("Concluir sem tudo marcado?", "O Portão só é vencido com todos os itens feitos dentro do tempo.", "Concluir assim mesmo")) return;
  const r = concluirPortao(todos); save(); refresh();
  await resultado(r, p);
};

async function resultado(r, p) {
  const T = TIPOS[p.tipo];
  if (!r.venceu) {
    await falhaFx(r.porTempo ? "O TEMPO ACABOU" : "O PORTÃO VENCEU", `${T.nome} · ${p.minutos ?? "—"} min`);
    if (r.eventos.length) await aviso("Portão falhou", `<ul class="list">${r.eventos.map(linhaEv).join("")}</ul>`);
    return refresh();
  }
  await celebrate(r.eventos);
  await bauFx(r.bau.raridade, RAR[r.bau.raridade].nome, RAR[r.bau.raridade].cor, r.bau.premios);
  await aviso(`${T.nome} vencido`, `<p>Em <b>${p.minutos} min</b> (limite ${p.desafio.limite}).</p>
    <ul class="list">${r.eventos.filter(e => e.xp).map(linhaEv).join("")}
      <li><span class="grow" style="text-align:left">Corpo de ${r.corpo.grau === "cavaleiro" ? "Cavaleiro" : r.corpo.grau === "elite" ? "Elite" : "Soldado"} esperando no Exército</span></li>
      ${r.item ? `<li><span class="grow" style="text-align:left">Equipamento: <b style="color:${RAR[r.item.rar].cor}">${esc(r.item.nome)}</b></span></li>` : ""}</ul>
    ${botaoCompartilhar("portao", { nome: T.nome, cor: T.cor, rank: p.rank, tempo: p.minutos })}`);
  await mostrarTitulos(checarConquistas()); save();
  refresh();
}

// ---- Impulso ---------------------------------------------------------------------------------
views.impulso = () => {
  const im = impulso(), a = im.atual, hoje = im.dias?.[today()] || 0;
  const xp = IMPULSO.xp + bonus().impulso;
  return `${header()}<div class="stack">${panel("Impulso", a ? `<p class="small muted" style="margin-top:0">[ MISSÃO DE EMERGÊNCIA DO SISTEMA ]</p>
      <p class="mid glow center">${esc(a.txt)}</p>
      <div class="timer num" id="im-timer">00:00</div>
      <p class="center small muted">Faça agora. O botão libera em ${a.seg >= 60 ? Math.round(a.seg / 60) + " min" : a.seg + " s"}.</p>
      <button class="btn primary block" id="im-ok" data-act="vencerImpulso" disabled>Venci o impulso</button>
      ${a.trocou ? "" : `<button class="btn ghost sm block" style="margin-top:8px" data-act="trocarImpulso">Trocar o desafio (1 vez)</button>`}`
    : `<p style="margin-top:0">Bateu a vontade de algo que você quer largar? Aperte o botão: o Sistema te dá na hora um desafio curto. A vontade vira treino.</p>
      <button class="btn primary block" data-act="gerarImpulso">⚡ Vencer um impulso agora</button>`)}
    ${panel("Impulsos vencidos", `<div class="grid2"><div class="tile"><div class="lbl">Total</div><div class="val num glow">${fmt(im.total || 0)}</div></div>
      <div class="tile"><div class="lbl">Hoje</div><div class="val num">${hoje}</div></div></div>
      <p class="small muted" style="margin-bottom:0">Os ${IMPULSO.xpPorDia} primeiros do dia valem +${xp} XP; todos contam no total e para os títulos.</p>`)}</div>`;
};
let tickIm = null;
views.impulso.after = () => {
  clearInterval(tickIm);
  const el = $("#im-timer"), a = impulso().atual; if (!el || !a) return;
  const upd = () => {
    if (!el.isConnected) return clearInterval(tickIm);
    const s = (Date.now() - a.inicio) / 1000; el.textContent = relogio(s);
    const b = $("#im-ok"); if (b) b.disabled = s < a.seg;
  };
  upd(); tickIm = setInterval(upd, 1000);
};
actions.gerarImpulso = () => { novoImpulso(); refresh(); };
actions.trocarImpulso = () => { novoImpulso(true); refresh(); };
actions.vencerImpulso = async () => {
  const r = vencerImpulso(); if (!r) return toast("Termine o desafio primeiro.");
  refresh();
  await celebrate(r.ev);
  toast(r.ev.length ? `Impulso vencido! +${r.ev[0].xp} XP · total ${r.total}` : `Impulso vencido! Total: ${r.total}`, 3500);
  await mostrarTitulos(r.titulos); save();
};
