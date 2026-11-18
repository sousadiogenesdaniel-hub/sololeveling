// Regras do Sistema: XP, nível, rank, Ouro, fechamento dos dias, Zona de Penalidade.
import { S, day, save } from "./store.js";
import { today, addDays, weekday, daysBetween, fmtDate, parseDay } from "./util.js";
import { progress, currentPhase, currentTrack, trackFinished, earlyFrom, SESSIONS_PER_STAGE } from "./tracks.js";

export const R = {
  treinoXp: 100, treinoOuro: 100,      // treino do dia concluído
  completoXp: 20,                      // todas as séries marcadas
  medidasXp: 10,                       // peso + abdômen do dia
  semanalXp: 30,                       // medidas semanais
  kcalXp: 20,                          // fechou o dia dentro da meta de calorias
  streakOuro: 50,                      // a cada 7 treinos seguidos
  faltaXp: -150, faltaOuro: -50,       // não treinou
  corrosaoXp: -30,                     // por dia com dívida não comprovada
  testeXp: 500, testeOuro: 300,        // passou no Teste de Rank
  // dieta (avaliada no fechamento do dia, não entra na Zona de Penalidade)
  dietaTolerancia: 100,                // kcal acima da meta sem punição (erro de registro)
  dietaPor100: 10,                     // −XP e −Ouro a cada 100 kcal acima da meta
  dietaXpMax: 150, dietaOuroMax: 100,  // limite por dia
  cotaPorOuro: 2,                      // compra na Loja libera 2 kcal por Ouro gasto naquele dia
};

// ---- nível e rank ------------------------------------------------------------------
// XP acumulado para chegar ao nível L. Cada nível pede 34 XP a mais que o anterior.
// O nível mínimo de cada rank chega algumas semanas ANTES do Teste de Rank jogando perfeito (~1.060 XP/semana),
// para o teste ser o portão normal e o XP só segurar quem falta muito.
// Perfeito: D ~1,6 mês · C ~3,5 · B ~6,7 · A ~11 · S ~18,5 (testes: 2, 4, 7, 12 e ~20 meses).
export const xpToReach = L => 150 * (L - 1) + 17 * (L - 1) * (L - 2);
export const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];
const RANK_LEVEL = { E: 1, D: 18, C: 28, B: 40, A: 52, S: 68 };
// Testes de Rank necessários para cada rank (fases concluídas em qualquer trilha): um teste por rank
export const RANK_TESTS = { E: 0, D: 1, C: 2, B: 3, A: 4, S: 5 };

export const rankByLevel = L => [...RANK_ORDER].reverse().find(r => L >= RANK_LEVEL[r]);
// Maior fase concluída em qualquer trilha: trocar de trilha não apaga o que você já provou.
export const testsPassed = () => Math.min(5, Math.max(0, ...Object.values(S.progress || {}).map(p => p.phase || 0)));
const maxRankByTests = n => [...RANK_ORDER].reverse().find(r => RANK_TESTS[r] <= n);

export function levelInfo(xp = S.game.xp) {
  let L = 1;
  while (xpToReach(L + 1) <= xp) L++;
  const base = xpToReach(L), next = xpToReach(L + 1);
  const porNivel = rankByLevel(L), porTeste = maxRankByTests(testsPassed());
  const rank = RANK_ORDER[Math.min(RANK_ORDER.indexOf(porNivel), RANK_ORDER.indexOf(porTeste))];
  return { level: L, into: xp - base, need: next - base, pct: (xp - base) / (next - base) * 100, rank,
    travado: RANK_ORDER.indexOf(porNivel) > RANK_ORDER.indexOf(rank) }; // nível já basta, falta o teste
}
export const rankOf = L => rankByLevel(L);

// O que falta para o próximo rank: nível e/ou Teste de Rank
export function nextRank(li = levelInfo()) {
  const r = RANK_ORDER[RANK_ORDER.indexOf(li.rank) + 1];
  if (!r) return null;
  const nivel = RANK_LEVEL[r], testes = RANK_TESTS[r];
  return { rank: r, level: nivel, faltaXp: Math.max(0, xpToReach(nivel) - S.game.xp),
    teste: testes > testsPassed() };
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
export function mealsOf(date = today()) { return S.days[date]?.meals || S.diet.meals; }
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
// Gasto do dia = repouso × 1,2 + treino + atividades extras (sem contar o repouso duas vezes)
export const extrasKcal = date => (S.days[date]?.extras || []).reduce((n, e) => n + e.kcal, 0);
export function spent(date = today()) {
  return Math.round(tmb(date) * 1.2 + (S.days[date]?.workout?.kcal || 0) + extrasKcal(date));
}
export function workoutKcal(date, durMin, indoor) {
  const met = indoor ? 5 : (currentTrack()?.met || 6);
  return Math.round((met - 1) * (tmb(date) / 24) * (Math.min(durMin, 120) / 60));
}

// ---- obrigação de treino ---------------------------------------------------------------
export const isRestDay = date => weekday(date) === (S.profile?.restDay ?? 0);
export function isObligated(date) {
  const desde = S.trackSince || S.track?.startDate; // vale mesmo no intervalo entre trocar de trilha e escolher outra
  return !!desde && date >= desde && !isRestDay(date) && !trackFinished();
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
export const debtMembers = debt => debt.membros?.length ? debt.membros : grupo().map(({ id, nome }) => ({ id, nome }));
export const debtValor = debt => debt.valor ?? S.profile?.multa ?? 10;
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
  if (!debt.membros?.length) debt.membros = debtMembers(debt); // congela quem estava no grupo
  const st = debtState(debt);
  if (st.ok) { debt.status = "validado"; debt.validatedAt = today(); }
  save();
  return st;
}

// ---- conclusão do treino -----------------------------------------------------------------
export function completeWorkout(date = today()) {
  const d = day(date), w = d.workout, events = [];
  w.done = true;
  const totalSets = w.plano.itens.reduce((n, i) => n + i.series, 0);
  const marks = Object.values(w.sets || {}).flat();
  const doneSets = marks.filter(Boolean).length, lowSets = marks.filter(m => m === "low").length;
  w.full = doneSets >= totalSets;          // todas as séries feitas (mesmo abaixo do alvo)
  w.hit = w.full && lowSets === 0;         // todas no alvo: conta para subir a carga
  events.push(grant(R.treinoXp, R.treinoOuro, "Missão diária concluída", date));
  if (w.full) events.push(grant(R.completoXp, 0, "Todas as séries concluídas", date));
  const g = S.game;
  g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak);
  if (g.streak % 7 === 0) events.push(grant(0, R.streakOuro, `Sequência de ${g.streak} treinos`, date));
  if (g.needsWorkout) { g.needsWorkout = false; events.push({ motivo: "Treino de redenção cumprido", xp: 0, gold: 0 }); }
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
  p.phase++; p.week = 1; p.sessions = 0; p.lastTestTry = null;
  const ev = grant(R.testeXp, R.testeOuro, `Teste do rank ${ph.rank} superado${antecipado ? " antecipadamente" : ""} (fase ${ph.nome})`);
  save();
  return { ...ev, ...changes(before, levelInfo()) }; // o teste pode destravar um rank
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
    if (!rec.meals) rec.meals = JSON.parse(JSON.stringify(S.diet.meals)); // congela a dieta do dia
    if (pendingDebts().length) report.push(grant(R.corrosaoXp, 0, `Dívida sem comprovante em ${fmtDate(d)}`, d));
    if (isObligated(d) && !rec.workout?.done) {
      S.debts.push({ date: d, serial: makeSerial(d), status: "pendente", valor: S.profile.multa ?? 10,
        membros: grupo().map(({ id, nome }) => ({ id, nome })), pagamentos: [] });
      g.needsWorkout = true; g.streak = 0;
      report.push({ ...grant(R.faltaXp, R.faltaOuro, `Missão diária FALHOU em ${fmtDate(d)}`, d), falta: true });
    }
    const dieta = dietVerdict(d, rec);
    if (dieta) report.push(grant(dieta.xp, dieta.gold, dieta.motivo, d));
    rec.closed = true;
    g.lastProcessed = d;
    d = addDays(d, 1);
  }
  save();
  return report;
}

// Próxima sexta-feira (0 = hoje é sexta)
export const daysToFriday = (date = today()) => (5 - parseDay(date).getDay() + 7) % 7;

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
