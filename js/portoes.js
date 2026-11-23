// Portões (dungeons): um por semana do jogo, num dia sorteado e sem aviso, com desafio calculado pelos seus
// máximos. Normal (opcional), Vermelho (mais difícil; depois de entrar, tem que terminar) e, mais raro,
// Emergência (obrigatório: ignorar ou falhar custa como uma falta, mas sem Zona de Penalidade nem multa).
import { S } from "./store.js";
import { today, addDays } from "./util.js";
import { possui } from "./premios.js";
import { weekStart, isRestDay, inPenalty, levelInfo, grant, RANK_ORDER } from "./game.js";
import { pr, currentPhase, testKey } from "./tracks.js";
import { novoCorpo } from "./feitos.js";
import { abrirBau, bonus, bonusEquip, darItem, sortearItemPortao, eventoHp, HP } from "./premios.js";

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

// Conclui: vence se tudo foi feito dentro do tempo. Prêmios: XP (+ anel), corpo, +1 HP e, às vezes, um item do
// Arsenal; com item, metade das vezes vem só ele (sem baú), na outra metade item e baú. Sem item, baú.
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
  const eventos = [grant(T.xp, 0, `${T.nome} vencido`), ...bonusEquip(T.xp, 0, "no Portão")];
  const hp = eventoHp(HP.portao, `Manto do Necromante: ${T.nome} vencido`); if (hp) eventos.push(hp);
  const it = sortearItemPortao(p.tipo);
  const item = it && darItem(it.id, `${T.nome} (rank ${p.rank})`) ? it : null;
  let bau = null;
  if (!item || Math.random() < .5) {
    const b = bonus();
    bau = abrirBau({ sorte: b.sorteTotal + (p.tipo === "vermelho" ? 30 : 0), minimo: p.tipo === "emergencia" ? "raro" : "epico", motivo: `Baú do ${T.nome}` });
    eventos.push(...bau.eventos);
  }
  const grau = p.tipo === "vermelho" ? "cavaleiro" : p.tipo === "emergencia" ? "soldado" : Math.random() < .2 ? "cavaleiro" : "elite";
  const corpo = novoCorpo({ grau, origem: `${T.nome} rank ${p.rank}` });
  if (item) p.item = item.id;
  return { venceu: true, eventos, bau, corpo, item };
}

// ---- Portões nomeados ---------------------------------------------------------------------
// Portão do Inferno (abre no rank A) e Portão do Trono (no S): os únicos que dão os Lendários do Arsenal. Feitos
// para ser quase impossíveis de primeira. São 3 chances por rank: cada abertura avisa e dá 7 dias para escolher o
// dia; no dia marcado, quem entra não deve a missão diária (o Portão é muito mais pesado). Falhou ou deixou passar,
// a próxima chance abre de 2 a 6 semanas depois. Gastou as 3, volta no rank seguinte; no S, 3 meses depois.
// Nunca some: a coleção sempre pode ser completada.
export const NOMEADOS = {
  inferno: { nome: "Portão do Inferno", rank: "A", item: "grimorio-noite", cor: "#ff5a2e" },
  trono: { nome: "Portão do Trono", rank: "S", item: "anel-dominio", cor: "#ffc94d" },
};
export const NOM = { chances: 3, escolher: 7, primeira: [7, 21], intervalo: [14, 42], pausaS: 90, xp: 1000, ouro: 500,
  gps: [{ tipo: "corrida", nome: "Corrida", km: 21 }, { tipo: "bike", nome: "Bicicleta", km: 40 }],
  extras: [{ nome: "Burpees", alvo: 100, un: "reps" }, { nome: "Afundos (somando as duas pernas)", alvo: 200, un: "reps" }] };
const entre = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
const ri = r => RANK_ORDER.indexOf(r);
export const nomeados = () => (S.nomeados ||= {});

// Desafio: cada prova da fase atual (a do próximo Teste de Rank) a 110–120% do seu último máximo, em até 2 séries
// somadas, sem chegar à meta do teste; mais burpees e afundos; mais 21 km de corrida e 40 km de bike pelo GPS do app.
export function desafioNomeado() {
  const ph = currentPhase(), itens = [];
  for (const [n, alvo, un] of ph?.tests || []) {
    if (un === "km") continue; // a corrida de 21 km já cobre
    const max = pr(testKey(n)) || Math.round(alvo * .8);
    let v = Math.round(max * (1.1 + Math.random() * .1));
    if (v >= alvo) v = Math.max(1, alvo - 1);
    itens.push({ nome: n.replace(/ seguid[oa]s$/, "").replace(/ seguidos$/, ""), alvo: v, un });
  }
  return { itens: [...itens, ...NOM.extras], gps: NOM.gps };
}

// Atualiza os dois Portões (ao abrir o app). Devolve os que acabaram de abrir (para o aviso).
export function atualizarNomeados() {
  const t = today(), rank = levelInfo().rank, abriram = [];
  for (const [k, N] of Object.entries(NOMEADOS)) {
    if (possui(N.item) || ri(rank) < ri(N.rank)) continue;
    const g = nomeados()[k] ||= { fase: rank, usadas: 0, status: "espera", abreEm: addDays(t, entre(NOM.primeira)) };
    if (g.status === "vencido") continue;
    if (ri(rank) > ri(g.fase) && g.status !== "ativo") { // subiu de rank: 3 chances novas
      g.fase = rank; g.usadas = 0;
      if (g.status === "esgotado") Object.assign(g, { status: "espera", abreEm: addDays(t, entre(NOM.primeira)) });
    }
    if (g.status === "aberto" && t > g.prazo) falhaNomeado(k, "O prazo para escolher o dia passou");
    if ((g.status === "marcado" || g.status === "ativo") && t > g.dia) falhaNomeado(k, g.status === "ativo" ? "Não foi concluído no dia" : "Não entrou no dia marcado");
    if (g.status === "esgotado" && g.fase === "S" && t >= g.abreEm) Object.assign(g, { usadas: 0, status: "espera" });
    if (g.status === "espera" && t >= g.abreEm) {
      Object.assign(g, { status: "aberto", abertoEm: t, prazo: addDays(t, NOM.escolher - 1), desafio: desafioNomeado() });
      delete g.dia; abriram.push(k);
    }
  }
  return abriram;
}
function falhaNomeado(k, motivo) {
  const g = nomeados()[k];
  (g.historico ||= []).push({ d: g.dia || g.prazo || today(), motivo, fase: g.fase });
  g.usadas++;
  delete g.dia; delete g.inicio; delete g.feitos;
  if (g.usadas < NOM.chances) Object.assign(g, { status: "espera", abreEm: addDays(today(), entre(NOM.intervalo)) });
  else Object.assign(g, { status: "esgotado", abreEm: g.fase === "S" ? addDays(today(), NOM.pausaS) : null });
}
export function marcarNomeado(k, dia) {
  const g = nomeados()[k];
  if (!g || !["aberto", "marcado"].includes(g.status) || dia < today() || dia > (g.prazo || today())) return false;
  g.status = "marcado"; g.dia = dia;
  return true;
}
export function entrarNomeado(k) {
  const g = nomeados()[k];
  if (!g || g.status !== "marcado" || g.dia !== today()) return false;
  g.status = "ativo"; g.inicio = Date.now();
  (S.diasNomeados ||= []).includes(today()) || S.diasNomeados.push(today()); // no dia do Portão, sem missão diária
  return true;
}
// Km rastreados pelo GPS do app no dia, por tipo
export const kmGps = (dia, tipo) => (S.days[dia]?.extras || []).filter(e => e.gps?.tipo === tipo).reduce((n, e) => n + (e.gps.km || 0), 0);
export function concluirNomeado(k) {
  const g = nomeados()[k], N = NOMEADOS[k];
  if (!g || g.status !== "ativo") return null;
  const forca = g.desafio.itens.every((_, i) => g.feitos?.[i]);
  const gps = g.desafio.gps.every(x => kmGps(g.dia, x.tipo) >= x.km);
  if (!forca || !gps) { const dia = g.dia; falhaNomeado(k, !gps ? "Faltaram quilômetros no GPS" : "Faltaram provas"); return { venceu: false, dia }; }
  g.status = "vencido"; g.vencidoEm = today();
  darItem(N.item, `${N.nome} (rank ${g.fase})`);
  const eventos = [grant(NOM.xp, NOM.ouro, `${N.nome} vencido`), ...bonusEquip(NOM.xp, NOM.ouro, "no Portão")];
  const hp = eventoHp(HP.portao, `Manto do Necromante: ${N.nome} vencido`); if (hp) eventos.push(hp);
  return { venceu: true, item: N.item, eventos };
}
