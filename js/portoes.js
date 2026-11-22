// Portões (dungeons): um por semana do jogo, num dia sorteado e sem aviso, com desafio calculado pelos seus
// máximos. Normal (opcional), Vermelho (mais difícil; depois de entrar, tem que terminar) e, mais raro,
// Emergência (obrigatório: ignorar ou falhar custa como uma falta, mas sem Zona de Penalidade nem multa).
import { S } from "./store.js";
import { today, addDays } from "./util.js";
import { weekStart, isRestDay, inPenalty, levelInfo, grant } from "./game.js";
import { pr } from "./tracks.js";
import { novoCorpo } from "./feitos.js";
import { abrirBau, bonus, darItem, sortearItem } from "./premios.js";

export const TIPOS = {
  normal: { nome: "Portão", cor: "#3fb8ff", xp: 100, fator: 1, chance: .73 },
  vermelho: { nome: "Portão Vermelho", cor: "#ff2e4d", xp: 200, fator: 1.3, chance: .15 },
  emergencia: { nome: "Portão de Emergência", cor: "#ffb020", xp: 100, fator: .85, chance: .12 },
};
export const PENA = { vermelho: { xp: -50, ouro: 0 }, emergencia: { xp: -150, ouro: -50 } };
const fimDaSemana = ws => addDays(ws, 6);
const sorteio = a => a[Math.floor(Math.random() * a.length)];

// Portão da semana (sorteado na primeira vez que o app abre na semana; o dia e o tipo ficam em segredo)
export function portaoSemana(ws = weekStart()) {
  S.portoes ||= {};
  if (!S.portoes[ws]) {
    const dias = [...Array(7)].map((_, i) => addDays(ws, i)).filter(d => d >= today() && !isRestDay(d));
    const r = Math.random();
    const tipo = r < TIPOS.emergencia.chance ? "emergencia" : r < TIPOS.emergencia.chance + TIPOS.vermelho.chance ? "vermelho" : "normal";
    S.portoes[ws] = dias.length && S.track ? { ws, dia: sorteio(dias), tipo, status: "oculto" } : { ws, status: "nenhum" };
  }
  return S.portoes[ws];
}
export const portaoAberto = () => Object.values(S.portoes || {}).find(p => p.status === "aberto" || p.status === "ativo") || null;
export const minutos = p => p.inicio ? (Date.now() - p.inicio) / 60000 : 0;

// Desafio calculado pelos seus máximos (sem máximo registrado, usa um valor de iniciante)
function desafio(tipo) {
  const f = TIPOS[tipo].fator, m = (k, d) => pr(k) || d;
  const flex = m("flexoes", 10), agach = m("agachamentos", 30), abd = m("abdominais", 20), prancha = m("prancha", 30);
  const modo = sorteio(["relogio", "circuito", "resistencia"]);
  if (modo === "relogio") {
    const pool = [["Flexões", flex], ["Agachamentos", agach], ["Abdominais supra", abd], ["Mergulhos nas paralelas", m("mergulhos", 5)], ["Remadas australianas", m("remadas", 8)]];
    const esc = [...pool].sort(() => Math.random() - .5).slice(0, 3);
    return { modo, titulo: "Contra o relógio", limite: tipo === "vermelho" ? 23 : 20,
      desc: "Complete o total de cada exercício, dividido em quantas séries quiser, antes do tempo acabar.",
      itens: esc.map(([nome, max]) => ({ nome, alvo: Math.max(10, Math.round(max * 3 * f)), un: "reps" })) };
  }
  if (modo === "circuito") {
    const rodadas = { normal: 4, vermelho: 5, emergencia: 3 }[tipo];
    const q = (max, min) => Math.max(min, Math.round(max * .5 * (tipo === "vermelho" ? 1.1 : 1)));
    const itens = [];
    for (let r = 1; r <= rodadas; r++) itens.push({ nome: `Rodada ${r}: ${q(flex, 5)} flexões · ${q(agach, 15)} agachamentos · ${q(abd, 10)} abdominais · ${q(prancha, 20)} s de prancha`, alvo: 1, un: "rodada" });
    return { modo, titulo: `Circuito de ${rodadas} rodadas`, limite: tipo === "vermelho" ? 28 : 25, itens,
      desc: "Faça as rodadas em sequência, descansando o mínimo entre elas." };
  }
  return { modo, titulo: "Resistência", limite: tipo === "vermelho" ? 17 : 15,
    desc: "Some os segundos de prancha e as repetições em quantas séries quiser, antes do tempo acabar.",
    itens: [{ nome: "Prancha (segundos somados)", alvo: Math.max(60, Math.round(prancha * 3 * f)), un: "s" },
      { nome: "Agachamentos", alvo: Math.max(30, Math.round(agach * 2.5 * f)), un: "reps" }] };
}

// Abre o portão no dia sorteado, fecha os vencidos e aplica a pena da Emergência ignorada.
// Devolve { eventos, abriu } (abriu = portão que acabou de abrir, para a animação).
export function atualizarPortoes() {
  const t = today(), eventos = [];
  let abriu = null;
  for (const p of Object.values(S.portoes || {})) {
    if (p.status === "aberto" && t > p.fecha) {
      if (p.tipo === "emergencia") { p.status = "ignorado"; eventos.push(grant(PENA.emergencia.xp, PENA.emergencia.ouro, "Portão de Emergência ignorado")); }
      else p.status = "expirou";
    }
    if (p.status === "ativo" && minutos(p) > p.desafio.limite + 120) { // entrou e não voltou para concluir
      p.status = "falhou"; const pe = PENA[p.tipo];
      if (pe) eventos.push(grant(pe.xp, pe.ouro, `${TIPOS[p.tipo].nome} não concluído`));
    }
    if (p.status === "oculto" && p.ws < weekStart()) p.status = "perdido";
  }
  const p = portaoSemana();
  if (p.status === "oculto" && t >= p.dia) {
    const testeColado = S.days[t]?.testeFeito || S.days[addDays(t, -1)]?.testeFeito;
    if (inPenalty() || testeColado) { // adia: nunca na Zona de Penalidade nem colado num Teste de Rank
      let prox = addDays(t, 1);
      while (prox <= fimDaSemana(p.ws) && isRestDay(prox)) prox = addDays(prox, 1);
      if (prox <= fimDaSemana(p.ws)) p.dia = prox; else p.status = "perdido";
    } else {
      Object.assign(p, { status: "aberto", abertoEm: t, fecha: addDays(t, 1), rank: levelInfo().rank, desafio: desafio(p.tipo) });
      abriu = p;
    }
  }
  return { eventos, abriu };
}

export function entrarPortao() {
  const p = portaoAberto();
  if (!p || p.status !== "aberto") return null;
  p.status = "ativo"; p.inicio = Date.now();
  return p;
}
// Sair sem concluir: só o Portão normal permite (Vermelho e Emergência contam como falha)
export function desistirPortao() {
  const p = portaoAberto();
  if (!p || p.status !== "ativo") return null;
  if (p.tipo === "normal") { p.status = "aberto"; delete p.inicio; return { voltou: true }; }
  return concluirPortao(false);
}

// Conclui: vence se tudo foi feito dentro do tempo. Prêmios: XP, baú (raridade mínima), corpo e chance de item.
export function concluirPortao(tudoFeito) {
  const p = portaoAberto(); if (!p || p.status !== "ativo") return null;
  const tempo = minutos(p), venceu = tudoFeito && tempo <= p.desafio.limite, T = TIPOS[p.tipo];
  p.fim = Date.now(); p.minutos = Math.round(tempo * 10) / 10;
  if (!venceu) {
    p.status = "falhou";
    const pe = PENA[p.tipo];
    return { venceu: false, porTempo: tudoFeito, eventos: pe ? [grant(pe.xp, pe.ouro, `${T.nome} falhou`)] : [] };
  }
  p.status = "vencido";
  const eventos = [grant(T.xp, 0, `${T.nome} vencido`)];
  const b = bonus();
  const bau = abrirBau({ sorte: b.sorteTotal + (p.tipo === "vermelho" ? 30 : 0), minimo: p.tipo === "emergencia" ? "raro" : "epico", motivo: `Baú do ${T.nome}` });
  eventos.push(...bau.eventos);
  const grau = p.tipo === "vermelho" ? "cavaleiro" : p.tipo === "emergencia" ? "soldado" : Math.random() < .2 ? "cavaleiro" : "elite";
  const corpo = novoCorpo({ grau, origem: `${T.nome} rank ${p.rank}` });
  let item = null;
  const chanceItem = { normal: .25, vermelho: .6, emergencia: 0 }[p.tipo];
  if (Math.random() < chanceItem) {
    const it = sortearItem(p.tipo === "vermelho" ? ["epico", "lendario"] : ["raro", "epico"]);
    const r = it && darItem(it.id, T.nome);
    if (r?.repetido) eventos.push(r.ev); else if (r) item = it;
  }
  return { venceu: true, eventos, bau, corpo, item };
}
