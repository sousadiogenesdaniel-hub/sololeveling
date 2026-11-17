// Regras do Sistema: XP, nível, rank, Ouro, fechamento dos dias, Zona de Penalidade.
import { S, day, save } from "./store.js";
import { today, addDays, weekday, daysBetween, fmtDate, parseDay } from "./util.js";
import { progress, currentPhase, currentTrack, trackFinished, SESSIONS_PER_STAGE } from "./tracks.js";

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
};

// ---- nível e rank ------------------------------------------------------------------
const xpToReach = L => 100 * (L - 1) + 10 * (L - 1) * (L - 2); // XP acumulado para chegar ao nível L
export function levelInfo(xp = S.game.xp) {
  let L = 1;
  while (xpToReach(L + 1) <= xp) L++;
  const base = xpToReach(L), next = xpToReach(L + 1);
  return { level: L, into: xp - base, need: next - base, pct: (xp - base) / (next - base) * 100, rank: rankOf(L) };
}
const RANKS = [[55, "S"], [42, "A"], [30, "B"], [20, "C"], [10, "D"], [1, "E"]];
export const rankOf = L => RANKS.find(([min]) => L >= min)[1];
export function nextRank(L) {
  const up = [...RANKS].reverse().find(([min]) => min > L);
  return up ? { rank: up[1], level: up[0] } : null;
}

export function grant(xp, gold, motivo, date = today()) {
  const g = S.game;
  const before = levelInfo().level;
  g.xp = Math.max(0, g.xp + xp);
  g.gold = Math.max(0, g.gold + gold);
  g.log.push({ d: date, xp, gold, motivo });
  if (g.log.length > 400) g.log.splice(0, g.log.length - 400);
  const after = levelInfo().level;
  return { xp, gold, motivo, levelUp: after > before ? after : null, levelDown: after < before ? after : null };
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
  return !!S.track && date >= S.track.startDate && !isRestDay(date) && !trackFinished();
}
export const pendingDebts = () => S.debts.filter(d => d.status !== "validado");
export const inPenalty = () => S.game.needsWorkout || pendingDebts().length > 0;

// ---- dívidas / mensagem de WhatsApp ------------------------------------------------------
// Código só com números: o OCR lê dígitos com muito mais segurança do que letras aleatórias.
export function makeSerial(date) {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return `PEN-${date.slice(2).replace(/-/g, "")}-${String(n).padStart(6, "0")}`;
}
export function debtMessage(debt) {
  const p = S.profile, valor = p.multa ?? 10;
  return `⚠️ ZONA DE PENALIDADE ⚠️\n` +
    `Código: ${debt.serial}\n\n` +
    `Eu, ${p.nome}, NÃO bati minha meta de treino no dia ${fmtDate(debt.date)}.\n` +
    `Por isso devo R$ ${valor},00 a cada pessoa deste grupo, a ser pago no final do mês.`;
}
export function monthDebt(ym = today().slice(0, 7)) {
  const n = S.debts.filter(d => d.date.startsWith(ym)).length;
  const p = S.profile || {};
  return { faltas: n, total: n * (p.multa ?? 10) * (p.pessoas ?? 1) };
}

// ---- conclusão do treino -----------------------------------------------------------------
export function completeWorkout(date = today()) {
  const d = day(date), w = d.workout, events = [];
  w.done = true;
  const totalSets = w.plano.itens.reduce((n, i) => n + i.series, 0);
  const doneSets = Object.values(w.sets || {}).reduce((n, arr) => n + arr.filter(Boolean).length, 0);
  w.full = doneSets >= totalSets;
  events.push(grant(R.treinoXp, R.treinoOuro, "Missão diária concluída", date));
  if (w.full) events.push(grant(R.completoXp, 0, "Todas as séries concluídas", date));
  const g = S.game;
  g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak);
  if (g.streak % 7 === 0) events.push(grant(0, R.streakOuro, `Sequência de ${g.streak} treinos`, date));
  if (g.needsWorkout) { g.needsWorkout = false; events.push({ motivo: "Treino de redenção cumprido", xp: 0, gold: 0 }); }
  if (w.full && !trackFinished()) {
    const p = progress(), ph = currentPhase();
    if (p.week <= ph.stages) {
      p.sessions++;
      if (p.sessions >= SESSIONS_PER_STAGE) {
        p.sessions = 0; p.week++;
        events.push({ motivo: p.week > ph.stages ? "Etapa final concluída: Teste de Rank liberado!" : `Avançou para a etapa ${p.week}: cargas aumentadas`, xp: 0, gold: 0 });
      }
    }
  }
  save();
  return events;
}

export function passTest() {
  const p = progress(), ph = currentPhase();
  p.phase++; p.week = 1; p.sessions = 0;
  const ev = grant(R.testeXp, R.testeOuro, `Meta de ${ph.prazo} conquistada`);
  save();
  return ev;
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
      S.debts.push({ date: d, serial: makeSerial(d), status: "pendente" });
      g.needsWorkout = true; g.streak = 0;
      report.push({ ...grant(R.faltaXp, R.faltaOuro, `Missão diária FALHOU em ${fmtDate(d)}`, d), falta: true });
    }
    const meta = S.profile.metaKcal, kcal = totals(rec.meals).kcal;
    if (meta && kcal > 0 && kcal <= meta) report.push(grant(R.kcalXp, 0, `Dentro da meta de calorias em ${fmtDate(d)}`, d));
    rec.closed = true;
    g.lastProcessed = d;
    d = addDays(d, 1);
  }
  save();
  return report;
}

// Próxima sexta-feira (0 = hoje é sexta)
export const daysToFriday = (date = today()) => (5 - parseDay(date).getDay() + 7) % 7;
