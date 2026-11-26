// Regras do Sistema: XP, nível, rank, Ouro, fechamento dos dias, Zona de Penalidade.
import { S, day, save } from "./store.js";
import { today, addDays, weekday, daysBetween, fmt, fmtDate, parseDay } from "./util.js";
import { progress, currentPhase, currentTrack, trackFinished, todasConcluidas, earlyFrom, advanceQueue, SESSIONS_PER_STAGE } from "./tracks.js";

export const R = {
  treinoXp: 100, treinoOuro: 100,      // treino do dia concluído
  completoXp: 20,                      // todas as séries marcadas
  medidasXp: 5,                        // peso + abdômen do dia
  condicaoXp: 5,                       // Condição de um dia registrada inteira (até o dia seguinte)
  semanalXp: 30,                       // medidas semanais
  kcalXp: 20,                          // fechou o dia dentro da meta de calorias
  streakOuro: 50,                      // a cada 7 treinos seguidos
  faltaXp: -150, faltaOuro: -50,       // não treinou
  faltaHp: -25,                        // e tira HP de quem tem o Manto do Necromante
  corrosaoXp: -30,                     // por dia com dívida não comprovada
  testeXp: 500, testeOuro: 300,        // passou no Teste de Rank
  // dieta (avaliada no fechamento do dia, não entra na Zona de Penalidade)
  dietaTolerancia: 100,                // kcal acima da meta sem punição (erro de registro)
  dietaPor100: 10,                     // −XP e −Ouro a cada 100 kcal acima da meta
  dietaXpMax: 150, dietaOuroMax: 100,  // limite por dia
  cotaPorOuro: 2,                      // compra na Loja libera 2 kcal por Ouro gasto naquele dia
};

// ---- nível e rank ------------------------------------------------------------------
// Duas medidas separadas:
// - NÍVEL = constância. Vem do XP. Começa rápido (~1 nível por missão na 1ª semana) e desacelera: cada nível
//   pede 16 XP a mais que o anterior. Jogando perfeito (~1.030 XP/semana): nível ~8 na 1ª semana, ~29 em 2 meses,
//   ~77 em 1 ano e 100 em ~20 meses. Não tem teto.
// - RANK = o que o seu corpo faz. Vem só do Teste de Rank: passou, sobe na hora, em qualquer nível.
//   Cada trilha tem o seu rank (fases concluídas); o rank do jogador é o melhor deles.
export const xpToReach = L => 100 * (L - 1) + 8 * (L - 1) * (L - 2);
const xpToReachV1 = L => 150 * (L - 1) + 17 * (L - 1) * (L - 2); // curva antiga (68 níveis até o S), para a migração
export const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];
// Testes de Rank necessários para cada rank (fases concluídas numa trilha): um teste por rank
export const RANK_TESTS = { E: 0, D: 1, C: 2, B: 3, A: 4, S: 5 };

// Rank de uma trilha: fases concluídas nela (testes já passados continuam valendo mesmo se a trilha for encerrada)
export const rankDe = id => RANK_ORDER[Math.min(5, S.progress?.[id]?.phase || 0)];
// Maior fase concluída em qualquer trilha
export const testsPassed = () => Math.min(5, Math.max(0, ...Object.values(S.progress || {}).map(p => p.phase || 0)));

function nivelDe(xp, curva = xpToReach) {
  let L = 1;
  while (curva(L + 1) <= xp) L++;
  return L;
}
export function levelInfo(xp = S.game.xp) {
  const L = nivelDe(xp), base = xpToReach(L), next = xpToReach(L + 1);
  return { level: L, into: xp - base, need: next - base, pct: (xp - base) / (next - base) * 100, rank: RANK_ORDER[testsPassed()] };
}

// O que falta para o próximo rank: só o Teste de Rank
export function nextRank(li = levelInfo()) {
  const r = RANK_ORDER[RANK_ORDER.indexOf(li.rank) + 1];
  return r ? { rank: r, teste: true } : null;
}

// Migração para a curva de 100 níveis (uma vez): o XP fica igual, só o nível é recalculado
export function migrarCurva() {
  const g = S.game;
  if ((g.curva || 1) >= 2) return null;
  g.curva = 2;
  if (!g.xp) return null; // jogador novo: nada a avisar
  const de = nivelDe(g.xp, xpToReachV1), para = nivelDe(g.xp);
  return { levelFrom: de, levelTo: para, levelUp: para > de ? para : null, rankFrom: levelInfo().rank };
}

function changes(a, b) {
  const ia = RANK_ORDER.indexOf(a.rank), ib = RANK_ORDER.indexOf(b.rank);
  return { levelUp: b.level > a.level ? b.level : null, levelDown: b.level < a.level ? b.level : null,
    rankUp: ib > ia ? b.rank : null, rankDown: ib < ia ? b.rank : null,
    levelFrom: a.level, levelTo: b.level, rankFrom: a.rank };
}

export function grant(xp, gold, motivo, date = today()) {
  const g = S.game;
  const before = levelInfo();
  g.xp = Math.max(0, g.xp + xp);
  g.gold = Math.max(0, g.gold + gold);
  g.log.push({ d: date, xp, gold, motivo });
  if (g.log.length > 400) g.log.splice(0, g.log.length - 400);
  return { xp, gold, motivo, ...changes(before, levelInfo()) };
}

// ---- nutrição ------------------------------------------------------------------------
// Dia em modo viagem (ativado na Missão; o dia em que você volta já é normal). Na viagem a comida não começa com a
// dieta padrão: o dia começa vazio e você anota o que comer (rancho, restaurante). As medidas são só com a fita.
export const emViagemDia = (d = today()) => (!!S.viagem && d >= S.viagem.inicio) || (S.viagens || []).some(v => d >= v.inicio && d < v.fim);
const refeicoesVazias = () => S.diet.meals.map(m => ({ ...m, itens: [] }));
export function mealsOf(date = today()) { return S.days[date]?.meals || (emViagemDia(date) ? refeicoesVazias() : S.diet.meals); }
export function totals(meals) {
  const t = { kcal: 0, p: 0, c: 0, gord: 0 };
  for (const m of meals) for (const i of m.itens) { t.kcal += i.kcal; t.p += i.p; t.c += i.c; t.gord += i.gord; }
  return t;
}
export function weightOn(date = today()) {
  const ds = Object.keys(S.days).filter(d => d <= date && S.days[d].peso).sort();
  return ds.length ? S.days[ds[ds.length - 1]].peso : S.profile?.pesoInicial ?? 70;
}
export function age(date = today()) {
  if (!S.profile?.nasc) return 30;
  return Math.floor(daysBetween(S.profile.nasc, date) / 365.25);
}
export function tmb(date = today()) { // Mifflin-St Jeor
  const p = S.profile; if (!p) return 1700;
  const base = 10 * weightOn(date) + 6.25 * (p.altura || 170) - 5 * age(date);
  return Math.round(base + (p.sexo === "feminino" ? -161 : 5));
}
// Gasto do dia = repouso × 1,2 + a soma de tudo o que você fez (sem contar o repouso duas vezes): missão, atividades
// extras, Dungeon de Campo, as outras dungeons e os impulsos vencidos.
// As atividades da Dungeon de Campo ficam na lista do dia (campo: true), mas não são atividades extras: não contam
// para as faixas de 250/700 kcal (campo: false tira elas da soma).
export const extrasKcal = (date, { campo = true } = {}) => (S.days[date]?.extras || []).filter(e => campo || !e.campo).reduce((n, e) => n + e.kcal, 0);
const gastosKcal = date => Object.values(S.days[date]?.gastos || {}).reduce((n, v) => n + v, 0);
export function spent(date = today()) {
  return Math.round(tmb(date) * 1.2 + (S.days[date]?.workout?.kcal || 0) + extrasKcal(date) + gastosKcal(date));
}
// As partes do gasto do dia (para mostrar de onde veio)
export function gastoPartes(date = today()) {
  const g = S.days[date]?.gastos || {}, todas = extrasKcal(date), extras = extrasKcal(date, { campo: false });
  return { repouso: Math.round(tmb(date) * 1.2), missao: S.days[date]?.workout?.kcal || 0, extras, campo: todas - extras,
    dungeons: g.dungeon || 0, impulsos: g.impulso || 0 };
}
// Esforço sem distância (dungeons de calistenia, impulsos): MET 8 = calistenia vigorosa; até 2 h por vez
export const kcalEsforco = (date, min, met = 8) => Math.round((met - 1) * (tmb(date) / 24) * (Math.min(Math.max(0, min), 120) / 60));
export function somarGasto(date, tipo, kcal) {
  if (!(kcal > 0)) return;
  const g = (day(date).gastos ||= {});
  g[tipo] = (g[tipo] || 0) + kcal;
}
export function workoutKcal(date, durMin, indoor) {
  const met = indoor ? 5 : (currentTrack()?.met || 6);
  return Math.round((met - 1) * (tmb(date) / 24) * (Math.min(durMin, 120) / 60));
}

// ---- Condição ------------------------------------------------------------------------------
// Os 4 itens de um dia registrados (sono, celular na cama, energia e foco) valem +5 XP, uma vez por dia, se
// registrados até o dia seguinte. O XP não depende das respostas: é pelo hábito de registrar.
export const condicaoCompleta = c => !!c && c.sono != null && !!c.cama && !!c.energia && !!c.foco;
export const condicaoPendente = d => !!S.profile && d >= (S.profile.criado || d) && !S.days[d]?.condXp && !condicaoCompleta(S.days[d]?.cond);
export function premiarCondicao(d) {
  const rec = S.days[d], t = today();
  if (!rec || rec.condXp || !condicaoCompleta(rec.cond) || d > t || d < addDays(t, -1)) return null;
  rec.condXp = true;
  return grant(R.condicaoXp, 0, `Condição de ${d === t ? "hoje" : "ontem"} registrada`, t);
}

// ---- obrigação de treino ---------------------------------------------------------------
// Dia de folga (comprado com 100 HP do Manto): conta como descanso, sem missão e sem penalidade
export const isFolga = date => (S.folgas || []).includes(date) || (S.diasNomeados || []).includes(date); // folga ou dia de Portão nomeado
export const isRestDay = date => weekday(date) === (S.profile?.restDay ?? 0) || isFolga(date);
export function isObligated(date) {
  const desde = S.trackSince || S.track?.startDate; // vale mesmo no intervalo entre trocar de trilha e escolher outra
  return !!desde && date >= desde && !isRestDay(date) && !todasConcluidas();
}
export const pendingDebts = () => S.debts.filter(d => d.status !== "validado");
export const inPenalty = () => S.game.needsWorkout || pendingDebts().length > 0;

// ---- dívidas -------------------------------------------------------------------------------
// Código de identificação de cada falta
export function makeSerial(date) {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return `PEN-${date.slice(2).replace(/-/g, "")}-${String(n).padStart(6, "0")}`;
}
// ---- dívidas pagas por PIX ----------------------------------------------------------------
// Cada falta custa a multa para CADA pessoa do grupo. Sai da Zona de Penalidade quando cada uma
// recebeu pelo menos a multa (soma dos comprovantes de PIX lidos pelo app) e o treino foi cumprido.
export const grupo = () => (S.grupo ||= []);
// Multa PENDENTE segue o valor e as pessoas atuais (Perfil e Penalidades); multa PAGA guarda o que
// valia quando foi quitada.
const pago = debt => debt.status === "validado";
export const debtMembers = debt => pago(debt) && debt.membros?.length ? debt.membros : grupo().map(({ id, nome }) => ({ id, nome }));
export const MULTA_MIN = 5;
export const multaAtual = () => Math.max(MULTA_MIN, S.profile?.multa ?? 10);
export const debtValor = debt => pago(debt) && debt.valor != null ? debt.valor : multaAtual();
export function debtState(debt) {
  const valor = debtValor(debt), pags = debt.pagamentos || [];
  const membros = debtMembers(debt).map(m => {
    const pago = pags.filter(p => p.membro === m.id).reduce((n, p) => n + p.valor, 0);
    return { ...m, pago, falta: Math.max(0, valor - pago) };
  });
  const total = valor * membros.length, pago = pags.reduce((n, p) => n + p.valor, 0);
  return { valor, membros, total, pago, ok: membros.length > 0 && membros.every(m => m.falta === 0) };
}
export function monthDebt(ym = today().slice(0, 7)) {
  const ds = S.debts.filter(d => d.date.startsWith(ym));
  const st = ds.map(debtState);
  return { faltas: ds.length, total: st.reduce((n, x) => n + x.total, 0), pago: st.reduce((n, x) => n + x.pago, 0) };
}
// Registra um comprovante lido. Devolve o estado atualizado da dívida.
export function addPayment(debt, pag) {
  (debt.pagamentos ||= []).push(pag);
  (S.pixIds ||= []).push(pag.chave, ...(pag.id ? [pag.id] : []));
  const st = debtState(debt);
  if (st.ok) settle(debt, st);
  save();
  return st;
}
// Quita: congela valor e pessoas da época
function settle(debt, st) {
  debt.status = "validado"; debt.validatedAt = today();
  debt.valor = st.valor; debt.membros = st.membros.map(({ id, nome }) => ({ id, nome }));
}
// Depois de mudar a multa ou o grupo: reconfere as pendentes (ex.: removeu a única pessoa que faltava pagar)
export function revalidateDebts() {
  const quitadas = [];
  for (const d of pendingDebts()) { const st = debtState(d); if (st.ok) { settle(d, st); quitadas.push(d.date); } }
  if (quitadas.length) save();
  return quitadas;
}

// ---- conclusão do treino -----------------------------------------------------------------
export function completeWorkout(date = today()) {
  const d = day(date), w = d.workout, events = [];
  w.done = true;
  advanceQueue(w);
  const totalSets = w.plano.itens.reduce((n, i) => n + i.series, 0);
  const marks = Object.values(w.sets || {}).flat();
  const doneSets = marks.filter(Boolean).length, lowSets = marks.filter(m => m === "low").length;
  w.series = { total: totalSets, feitas: doneSets, baixas: lowSets }; // para a animação de missão concluída
  const especial = !!w.plano?.modo;        // Dia de Avaliação / Teste de Rank: vale a missão, não a carga
  w.full = !especial && doneSets >= totalSets;  // todas as séries feitas (mesmo abaixo do alvo)
  w.hit = w.full && lowSets === 0;              // todas no alvo: conta para subir a carga
  events.push(grant(R.treinoXp, R.treinoOuro, especial ? `Missão diária concluída: ${w.plano.titulo}` : "Missão diária concluída", date));
  if (especial) events.push({ motivo: "O treino da fila fica para amanhã", xp: 0, gold: 0 });
  if (w.full) events.push(grant(R.completoXp, 0, "Todas as séries concluídas", date));
  if (!especial && w.trackId && S.progress?.[w.trackId]?.nivelamento) delete S.progress[w.trackId].nivelamento; // 1º treino normal: fim do nivelamento
  const g = S.game;
  g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak);
  if (g.streak % 7 === 0) events.push(grant(0, R.streakOuro, `Sequência de ${g.streak} treinos`, date));
  if (g.needsWorkout) { g.needsWorkout = false; events.push({ motivo: "Treino de redenção cumprido", xp: 0, gold: 0 }); }
  const bonus = checkGpsBonus(date); // atividade longa feita antes da missão: o bônus entra agora
  if (bonus) events.push(bonus);
  if (w.full && !w.hit) events.push({ motivo: `${lowSets} série${lowSets > 1 ? "s" : ""} abaixo do alvo: a carga não sobe neste treino`, xp: 0, gold: 0 });
  if (w.hit && !trackFinished()) {
    const p = progress(), ph = currentPhase();
    if (p.week <= ph.stages) {
      p.sessions++;
      if (p.sessions >= SESSIONS_PER_STAGE) {
        p.sessions = 0; p.week++;
        events.push({ motivo: p.week > ph.stages ? "Etapa final concluída: Teste de Rank liberado!" : `Avançou para a etapa ${p.week}: cargas aumentadas`, xp: 0, gold: 0 });
        if (p.week === earlyFrom(ph)) events.push({ motivo: `Metade da fase concluída: Teste antecipado do rank ${ph.rank} liberado (opcional)`, xp: 0, gold: 0 });
      }
    }
  }
  save();
  return events;
}

// Passar no teste dá só o bônus de XP (no máximo ~2 níveis): nunca pula direto para o nível do rank.
export function passTest(antecipado = false) {
  const p = progress(), ph = currentPhase(), before = levelInfo();
  // a trilha avança de fase na hora (treinos da fase seguinte), em qualquer nível
  p.phase++; p.week = 1; p.sessions = 0; p.lastTestTry = null; delete p.antecipada;
  const ev = grant(R.testeXp, R.testeOuro, `Teste do rank ${ph.rank} superado${antecipado ? " antecipadamente" : ""} (${currentTrack().nome}, fase ${ph.nome})`);
  save();
  return { ...ev, ...changes(before, levelInfo()) }; // o rank sobe na hora se for o seu melhor
}

// ---- fechamento dos dias passados ----------------------------------------------------------
// Roda ao abrir o app: fecha cada dia entre o último processado e ontem.
export function processDays() {
  const g = S.game, t = today(), report = [];
  if (!S.profile) return report;
  if (!g.lastProcessed) { g.lastProcessed = addDays(t, -1); save(); return report; }
  let d = addDays(g.lastProcessed, 1);
  while (d < t) {
    const rec = day(d);
    if (!rec.meals) rec.meals = JSON.parse(JSON.stringify(mealsOf(d))); // congela a dieta do dia (na viagem, o dia vazio)
    if (pendingDebts().length) report.push(grant(R.corrosaoXp, 0, `Dívida sem comprovante em ${fmtDate(d)}`, d));
    if (isObligated(d) && !rec.workout?.done) {
      S.debts.push({ date: d, serial: makeSerial(d), status: "pendente", pagamentos: [] });
      g.needsWorkout = true; g.streak = 0;
      const ev = { ...grant(R.faltaXp, R.faltaOuro, `Missão diária FALHOU em ${fmtDate(d)}`, d), falta: true };
      if (typeof S.hp === "number") { const a = S.hp; S.hp = Math.max(0, a + R.faltaHp); ev.hp = S.hp - a; } // falta = dano no HP do Manto
      report.push(ev);
    }
    const dieta = dietVerdict(d, rec);
    if (dieta) report.push(grant(dieta.xp, dieta.gold, dieta.motivo, d));
    // fim da semana do jogo: bônus da semana inteira dentro da meta de calorias
    if (d === weekEnd(d) && dietWeek(d, true).every(Boolean) && cleanWeek(d)) {
      const ev = payBonus(d, "dieta", BONUS.dietaOuro, "Bônus da dieta: semana inteira dentro da meta de calorias");
      if (ev) report.push(ev);
    }
    rec.closed = true;
    g.lastProcessed = d;
    d = addDays(d, 1);
  }
  save();
  return report;
}

// Loja aberta na sexta, no sábado e no domingo. daysToShop: 0 = aberta hoje; senão, dias até a próxima sexta.
export const SHOP_DAYS = [5, 6, 0];
export const shopOpen = (date = today()) => SHOP_DAYS.includes(parseDay(date).getDay());
export const daysToShop = (date = today()) => shopOpen(date) ? 0 : (5 - parseDay(date).getDay() + 7) % 7;

// ---- meta de peso -----------------------------------------------------------------------
// Faixa aceitável: alvo ± margem (ex.: 63 ± 4 → 59 a 67 kg)
export function weightGoal() {
  const p = S.profile || {}; if (!p.metaPeso) return null;
  const m = p.metaMargem || 0;
  return { alvo: p.metaPeso, piso: p.metaPeso - m, teto: p.metaPeso + m, margem: m };
}

// Tendência do peso (kg por semana) por regressão linear dos últimos `dias` dias.
// Precisa de pelo menos 6 pesagens espalhadas por 10 dias ou mais.
export function weightTrend(dias = 28, ate = today()) {
  const de = addDays(ate, -dias + 1);
  const pts = Object.keys(S.days).filter(d => d >= de && d <= ate && S.days[d].peso).map(d => [daysBetween(de, d), S.days[d].peso]);
  if (pts.length < 6 || pts[pts.length - 1][0] - pts[0][0] < 10) return null;
  const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
  const slope = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
  return { porSemana: slope * 7, atual: my + slope * (daysBetween(de, ate) - mx) };
}

// ---- meta de calorias automática --------------------------------------------------------
// meta = gasto diário estimado − déficit. O gasto vem de duas fontes:
//  1. fórmula: repouso (Mifflin-St Jeor, pelo peso de tendência) × 1,2 + média dos treinos da semana;
//  2. dados reais (a partir de ~4 semanas): o que você comeu + o que emagreceu (7.700 kcal ≈ 1 kg).
// Com dados reais suficientes, usa a média das duas (corrige o erro de 10–20% da fórmula).
// Atividades extras ficam de fora de propósito: elas não viram "crédito" para comer mais.
export const KCAL_AUTO = { deficit: 500, piso: 1700, passoMax: 100, intervalo: 7 };

export function autoKcal(date = today()) {
  const p = S.profile, goal = weightGoal();
  const tr = weightTrend(28, date);
  const peso = tr?.atual ?? weightOn(date);
  // repouso pelo peso de tendência (menos sensível a uma pesagem fora da curva)
  const repouso = Math.round(10 * peso + 6.25 * (p.altura || 170) - 5 * age(date) + (p.sexo === "feminino" ? -161 : 5));
  const treinos = Object.keys(S.days).filter(d => d < date && S.days[d].workout?.done).sort().slice(-6).map(d => S.days[d].workout.kcal);
  const porTreino = treinos.length ? treinos.reduce((a, b) => a + b, 0) / treinos.length : (S.track ? workoutKcal(date, 50) : 0);
  const formula = Math.round(repouso * 1.2 + porTreino * 6 / 7);

  // gasto real: só depois de 2 semanas do início (a perda de água das primeiras semanas engana a conta)
  let real = null, base = { dias: 0 };
  const desde = p.criado ? addDays(p.criado, 14) : null;
  const janela = desde ? Math.min(28, daysBetween(desde, date)) : 0;
  if (janela >= 21) {
    const trR = weightTrend(janela, date);
    const de = addDays(date, -janela);
    const ingest = Object.keys(S.days).filter(d => d >= de && d < date).map(d => totals(mealsOf(d)).kcal).filter(k => k > 500);
    if (trR && ingest.length >= janela * 0.7) {
      const media = ingest.reduce((a, b) => a + b, 0) / ingest.length;
      real = Math.round(media - trR.porSemana * 7700 / 7);
      real = Math.round(Math.min(formula * 1.2, Math.max(formula * 0.8, real))); // protege de dados ruins
      base = { dias: janela, media: Math.round(media), porSemana: trR.porSemana };
    }
  }
  const gasto = real ? Math.round((formula + real) / 2) : formula;

  // perto da meta, o déficit diminui; no alvo, vira manutenção
  let deficit = p.kcalDeficit ?? KCAL_AUTO.deficit, fase = "emagrecer";
  if (goal && peso <= goal.alvo) { deficit = 0; fase = "manter"; }
  else if (goal && peso <= goal.teto) { deficit = Math.round(deficit / 2); fase = "faixa"; }
  const piso = p.kcalPiso ?? KCAL_AUTO.piso;
  const meta = Math.max(piso, Math.round((gasto - deficit) / 10) * 10);
  return { meta, gasto, formula, real, deficit, piso, peso: Math.round(peso * 10) / 10, fase, base };
}

// Aplica o ajuste no máximo uma vez a cada 7 dias e com passo de até 100 kcal. Devolve a mudança, se houve.
export function applyAutoKcal(force = false, date = today()) {
  const p = S.profile;
  if (!p?.kcalAuto) return null;
  if (emViagemDia(date)) return null; // na viagem fica pausada: sem balança e com outra comida, ajustaria com dado errado
  if (!force && p.kcalAutoEm && daysBetween(p.kcalAutoEm, date) < KCAL_AUTO.intervalo) return null;
  const calc = autoKcal(date), antes = p.metaKcal;
  let nova = calc.meta;
  if (!force && antes) nova = antes + Math.max(-KCAL_AUTO.passoMax, Math.min(KCAL_AUTO.passoMax, nova - antes));
  p.kcalAutoEm = date;
  p.kcalAutoCalc = calc;
  if (nova === antes) { save(); return null; }
  p.metaKcal = nova;
  grant(0, 0, `Meta de calorias ajustada: ${antes ? antes + " → " : ""}${nova} kcal`, date);
  save();
  return { antes, nova, calc };
}

// ---- dieta: cota da Loja e veredito do dia ------------------------------------------------
export const cotaKcal = date => (S.purchases || []).filter(p => p.date === date).reduce((n, p) => n + p.custo, 0) * R.cotaPorOuro;

// Avaliado só no fechamento do dia (no dia seguinte): durante o dia a dieta padrão já vem
// lançada e o total pode passar da meta só momentaneamente.
export function dietVerdict(d, rec = S.days[d]) {
  const meta = S.profile?.metaKcal, kcal = Math.round(totals(rec?.meals || mealsOf(d)).kcal);
  if (!meta || kcal <= 0) return null;
  if (kcal <= meta) return { xp: R.kcalXp, gold: 0, motivo: `Dentro da meta de calorias em ${fmtDate(d)}` };
  const limite = meta + cotaKcal(d), acima = kcal - limite;
  if (acima <= R.dietaTolerancia) return null; // dentro da tolerância ou da cota da Loja
  const n = Math.round(acima / 100) * R.dietaPor100;
  return { xp: -Math.min(R.dietaXpMax, n), gold: -Math.min(R.dietaOuroMax, n),
    motivo: `Passou ${acima} kcal da meta${cotaKcal(d) ? " (já contando a cota da Loja)" : ""} em ${fmtDate(d)}` };
}

// ---- semana do jogo e missões bônus -----------------------------------------------------
// A semana do jogo começa no dia seguinte ao descanso (descanso na sexta → semana de sábado a sexta).
// Missões bônus nunca substituem a missão do dia e têm teto semanal (a Dungeon de Campo sorteia Ouro ou XP; ver CAMPO_XP).
// Atividade longa por GPS: semana limpa (sem falta) vale gpsOuro; semana com falta vale gpsOuroSeq se as
// últimas `seguidos` missões estiverem cumpridas. Na Zona de Penalidade, nada.
export const BONUS = { gpsOuro: 125, gpsOuroSeq: 75, seguidos: 3, dietaOuro: 150, teto: 300 };
// Dungeon de Campo: o prêmio é sorteado (50/50) entre o Ouro e o XP equivalente: 125 Ouro ↔ 100 XP, 75 ↔ 60. O XP
// conta no teto semanal pelo valor em Ouro. (Nada opcional dá mais XP que a missão.)
export const CAMPO_XP = 0.8;
export const campoXp = ouro => Math.round(ouro * CAMPO_XP);
// Dungeon de Campo (no lugar da antiga missão bônus de GPS): o jogador escolhe entrar. Lá dentro, um percurso só,
// rastreado pelo GPS do começo ao fim (pode pausar): 5 km correndo, 10 km de caminhada, 10 km de trilha ou 35 km de
// bike. Uma tentativa por tipo no dia: só a primeira de cada tipo conta. O que é feito na dungeon não é atividade
// extra (exclusivos), mas as calorias entram no gasto do dia. A chave é o tipo da atividade.
export const CAMPO = { corrida: { nome: "correndo", rotulo: "Corrida", km: 5 }, caminhada: { nome: "de caminhada", rotulo: "Caminhada", km: 10 },
  trilha: { nome: "de trilha", rotulo: "Trilha", km: 10 }, bike: { nome: "de bike", rotulo: "Bike", km: 35 } };
// A distância sobe com o rank (o prêmio não: cada nível já custa mais XP, e o Ouro compra comida de verdade).
// No S fica abaixo da Dungeon do Inferno (21 km correndo + 40 km de bike).
export const CAMPO_KM = { E: { corrida: 5, caminhada: 10, trilha: 10, bike: 35 }, D: { corrida: 6, caminhada: 12, trilha: 12, bike: 40 },
  C: { corrida: 8, caminhada: 14, trilha: 14, bike: 50 }, B: { corrida: 10, caminhada: 16, trilha: 16, bike: 60 },
  A: { corrida: 12, caminhada: 18, trilha: 18, bike: 70 }, S: { corrida: 15, caminhada: 20, trilha: 20, bike: 80 } };
export const metaCampo = (k, rank = levelInfo().rank) => CAMPO_KM[rank]?.[k] ?? CAMPO[k]?.km ?? 5;
// A meta de uma tentativa é a do rank em que ela começou (guardada na atividade)
export const metaDe = e => e?.campo?.meta ?? CAMPO[e?.tipo]?.km ?? 5;
export const campoDe = k => CAMPO[k] || (k === "andando" ? CAMPO.caminhada : CAMPO.corrida); // "andando" = regra antiga
// A tentativa de cada tipo no dia: a primeira atividade da dungeon daquele tipo (null = ainda não tentou)
export const tentativaCampo = (date, k) => (S.days[date]?.extras || []).find(e => e.campo && e.tipo === k) || null;
export const tentouCampo = (date, k) => !!tentativaCampo(date, k) || (S.days[date]?.campoTent || []).includes(k);
export function kmCampo(date = today()) {
  return Object.fromEntries(Object.keys(CAMPO).map(k => { const e = tentativaCampo(date, k); return [k, e ? e.gps?.km || 0 : null]; }));
}
export const campoBatido = (date = today()) => Object.keys(CAMPO).find(k => { const e = tentativaCampo(date, k); return e && (e.gps?.km || 0) >= metaDe(e); }) || null;
export function weekStart(date = today()) {
  const ini = ((S.profile?.restDay ?? 0) + 1) % 7;
  let d = date; while (weekday(d) !== ini) d = addDays(d, -1);
  return d;
}
export const weekEnd = (date = today()) => addDays(weekStart(date), 6);
const bonusLog = () => (S.bonus ||= []);
export const bonusWeek = (date = today()) => bonusLog().filter(b => weekStart(b.date) === weekStart(date)).reduce((n, b) => n + b.ouro, 0);
// Semana limpa: nenhuma falta desde o início da semana do jogo e fora da Zona de Penalidade
export const cleanWeek = (date = today()) => !S.debts.some(d => d.date >= weekStart(date) && d.date <= date) && !pendingDebts().length;

function payBonus(date, tipo, ouro, motivo, emXp = false) {
  const v = Math.min(ouro, BONUS.teto - bonusWeek(date));
  if (v <= 0) return null;
  const lim = v < ouro ? " (limite semanal)" : "";
  bonusLog().push({ date, tipo, ouro: v, ...(emXp ? { xp: campoXp(v) } : {}) }); // ouro = o que conta no teto
  return emXp ? grant(campoXp(v), 0, motivo + lim, date) : grant(0, v, motivo + lim, date);
}

// Missões cumpridas seguidas até `date` (a do próprio dia conta se já foi feita), pulando o descanso
export function treinosSeguidos(date = today()) {
  let n = 0;
  for (let i = 0, d = date; i < 30; i++, d = addDays(d, -1)) {
    if (S.days[d]?.workout?.done) { n++; continue; }
    if (d === date || isRestDay(d)) continue; // hoje ainda dá tempo; descanso não quebra
    break; // falta (ou antes de começar a trilha)
  }
  return n;
}

// Quanto a atividade longa vale no dia (contando a missão do dia como feita): 125, 75 ou 0
export function gpsBonusValor(date = today()) {
  if (pendingDebts().length) return 0;
  if (cleanWeek(date)) return BONUS.gpsOuro;
  const n = treinosSeguidos(date) + (S.days[date]?.workout?.done ? 0 : 1);
  return n >= BONUS.seguidos ? BONUS.gpsOuroSeq : 0;
}

// Por que a Dungeon de Campo está (ou não) valendo no dia, e quanto vale
export function gpsBonusStatus(date = today()) {
  if (isRestDay(date)) return { ok: false, motivo: "No dia de descanso a Dungeon de Campo fica fechada: descansar faz parte do treino." };
  if (pendingDebts().length) return { ok: false, motivo: "Na Zona de Penalidade: a Dungeon de Campo fica fechada até você sair dela." };
  if (bonusLog().some(b => b.date === date && b.tipo === "gps")) return { ok: false, feito: true, motivo: "Dungeon de Campo de hoje vencida." };
  if (bonusWeek(date) >= BONUS.teto) return { ok: false, motivo: `Limite de ${BONUS.teto} de Ouro em bônus nesta semana atingido.` };
  const valor = gpsBonusValor(date), limpa = cleanWeek(date);
  const porque = limpa ? "semana sem falta" : `semana com falta, mas ${BONUS.seguidos} missões seguidas`;
  if (!valor) {
    const faltam = BONUS.seguidos - treinosSeguidos(date) - (S.days[date]?.workout?.done ? 0 : 1);
    return { ok: false, motivo: `Semana com falta: a Dungeon de Campo volta (${BONUS.gpsOuroSeq} Ouro ou ${campoXp(BONUS.gpsOuroSeq)} XP) depois de ${BONUS.seguidos} missões seguidas cumpridas. Falta${faltam > 1 ? "m" : ""} ${faltam} além da de hoje.` };
  }
  const premio = `${valor} Ouro ou ${campoXp(valor)} XP, no sorteio`;
  if (!S.days[date]?.workout?.done) return { ok: false, pendente: true, valor, motivo: `Vale ${premio} (${porque}). Ela é vencida quando a missão do dia for concluída (pode entrar antes; o prêmio entra ao concluir a missão).` };
  return { ok: true, valor, motivo: `Aberta hoje: ${premio} (${porque}).` };
}

// Paga o bônus se a tentativa de um tipo na Dungeon de Campo bateu a distância (chamado ao finalizar o percurso
// e ao concluir a missão)
export function checkGpsBonus(date = today()) {
  if (!gpsBonusStatus(date).ok) return null;
  const k = campoBatido(date); if (!k) return null;
  const km = kmCampo(date)[k];
  const emXp = Math.random() < .5; // sorteio: Ouro ou XP
  const ev = payBonus(date, "gps", gpsBonusValor(date), `Dungeon de Campo vencida: ${fmt(km, 1)} km ${CAMPO[k].nome} pelo GPS`, emXp);
  if (ev) { Object.assign(bonusLog().at(-1), { campo: k, km: Math.round(km * 10) / 10, meta: metaDe(tentativaCampo(date, k)) }); ev.sorteio = emXp ? "xp" : "ouro"; save(); }
  return ev;
}

// Dias da semana do jogo dentro da meta de calorias (contando a cota da Loja). Na tela, só os dias já
// fechados contam (incluirDia = false); no fechamento do último dia da semana, ele entra.
export function dietWeek(date = today(), incluirDia = false) {
  const ini = weekStart(date), meta = S.profile?.metaKcal;
  return Array.from({ length: 7 }, (_, i) => addDays(ini, i)).map(d => {
    if (d > date || (d === date && !incluirDia)) return null;
    const kcal = totals(S.days[d]?.meals || mealsOf(d)).kcal;
    return !!meta && kcal > 0 && kcal <= meta + cotaKcal(d) && d >= (S.profile?.criado || d);
  });
}
