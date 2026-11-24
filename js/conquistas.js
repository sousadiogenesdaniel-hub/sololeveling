// Contadores da vida inteira, marcos, títulos (conquistas) com raridade, atributos da Janela de Status e o
// relatório semanal do Sistema.
import { S } from "./store.js";
import { today, addDays, fmt } from "./util.js";
import { levelInfo, isObligated, weightOn, weightGoal, mealsOf, totals as totalDieta, cotaKcal, RANK_ORDER, weekStart } from "./game.js";
import { pr } from "./tracks.js";
import { novoCorpo } from "./feitos.js";
import { RAR, ORDEM_RAR } from "./premios.js";

// ---- contadores da vida inteira ------------------------------------------------------------
// Somam as séries marcadas (no alvo ou abaixo) × repetições de cada exercício, por família de movimento.
export const CONTADORES = [
  { id: "flexoes", nome: "Flexões", re: /flex[aã]o|flexões/i, un: "reps" },
  { id: "agachamentos", nome: "Agachamentos", re: /agachamento/i, un: "reps" },
  { id: "abdominais", nome: "Abdominais", re: /abdominal|abdominais/i, un: "reps" },
  { id: "barras", nome: "Barras", re: /^barra|série longa de barras/i, un: "reps" },
  { id: "mergulhos", nome: "Mergulhos", re: /mergulho/i, un: "reps" },
  { id: "remadas", nome: "Remadas", re: /remada/i, un: "reps" },
  { id: "prancha", nome: "Prancha e isometria", re: /prancha|hollow|l-sit|suspensão|front lever/i, un: "s" },
];
export function totais(ate = today(), desde = "") {
  const t = { missoes: 0, km: 0 };
  CONTADORES.forEach(c => { t[c.id] = 0; });
  for (const [d, rec] of Object.entries(S.days)) {
    if (d < desde || d > ate) continue;
    const w = rec.workout;
    if (w?.done) {
      t.missoes++;
      (w.plano?.itens || []).forEach((it, e) => {
        const n = (w.sets?.[e] || []).filter(Boolean).length; if (!n) return;
        if (it.un === "km") { t.km += it.alvo * n; return; }
        const c = CONTADORES.find(x => x.re.test(it.nome));
        if (!c || (c.un === "s") !== (it.un === "s")) return;
        t[c.id] += it.alvo * n * (/cada (perna|lado)/i.test(it.nome) ? 2 : 1);
      });
    }
    for (const e of rec.extras || []) if (e.dados?.dist) t.km += e.dados.dist;
  }
  t.km = Math.round(t.km * 10) / 10;
  return t;
}

// ---- marcos (cada marco novo deixa um corpo para o Exército) --------------------------------
const MARCOS = {
  flexoes: [100, 500, 1000, 2500, 5000, 10000, 25000], agachamentos: [100, 500, 1000, 2500, 5000, 10000, 25000],
  abdominais: [100, 500, 1000, 2500, 5000, 10000, 25000], barras: [50, 100, 250, 500, 1000, 2500],
  mergulhos: [100, 500, 1000, 2500, 5000], remadas: [100, 500, 1000, 2500, 5000],
  prancha: [600, 1800, 3600, 10800, 36000], km: [10, 50, 100, 250, 500, 1000],
};
export function textoMarco(k, v) {
  if (k === "km") return `${fmt(v)} km`;
  if (k === "prancha") return `${fmt(v / 60)} min de prancha e isometria`;
  return `${fmt(v)} ${CONTADORES.find(c => c.id === k).nome.toLowerCase()}`;
}
export function checarMarcos() {
  const t = totais(), novos = [];
  S.marcos ||= {};
  for (const [k, lista] of Object.entries(MARCOS)) lista.forEach((v, i) => {
    const key = `${k}:${v}`;
    if (S.marcos[key] || t[k] < v) return;
    S.marcos[key] = today();
    novos.push({ k, v, texto: textoMarco(k, v), corpo: novoCorpo({ grau: i >= 3 ? "elite" : "soldado", origem: `Marco: ${textoMarco(k, v)}` }) });
  });
  return novos;
}

// ---- contexto para títulos e atributos ------------------------------------------------------
function semanasPerfeitas() {
  const desde = S.trackSince || S.track?.startDate; if (!desde) return 0;
  let n = 0;
  for (let ws = weekStart(desde); addDays(ws, 6) < today(); ws = addDays(ws, 7)) {
    const dias = [...Array(7)].map((_, i) => addDays(ws, i)).filter(d => isObligated(d));
    if (dias.length && dias.every(d => S.days[d]?.workout?.done)) n++;
  }
  return n;
}
export function contexto() {
  const li = levelInfo(), feitos = Object.values(S.days).filter(r => r.workout?.done);
  const portoes = Object.values(S.portoes || {}).filter(p => p.status === "vencido");
  return {
    t: totais(), li, nivel: li.level, rankIdx: RANK_ORDER.indexOf(li.rank), streak: S.game.bestStreak || 0,
    semanas: semanasPerfeitas(), testes: Object.values(S.progress || {}).reduce((n, p) => n + (p.phase || 0), 0),
    portoes: portoes.length, vermelhos: portoes.filter(p => p.tipo === "vermelho").length,
    sombras: (S.sombras || []).length, comandantes: (S.sombras || []).filter(s => s.cmd).length,
    cavaleiros: (S.sombras || []).filter(s => s.grau === "cavaleiro").length, cmdD: (S.sombras || []).some(s => s.cmd === "D"),
    impulsos: S.impulso?.total || 0, recordes: (S.recordes || []).length, classe: S.classe || null,
    antes6: feitos.filter(r => r.workout.in?.t && new Date(r.workout.in.t).getHours() < 6).length,
    chuva: feitos.filter(r => r.workout.indoor).length,
  };
}

// ---- títulos ---------------------------------------------------------------------------------
// rar: comum → mítico. secreto: o nome e a regra só aparecem quando conquista. classe: título da classe
// (trocar de classe recomeça esses). prog: [atual, meta] para a barra de progresso.
export const TITULOS = [
  { id: "mais-fraco", nome: "O Mais Fraco", rar: "comum", desc: "Todo caçador começa de algum lugar.", cond: () => true },
  { id: "primeiro-passo", nome: "Primeiro Passo", rar: "comum", desc: "Concluir a primeira missão.", prog: c => [c.t.missoes, 1] },
  { id: "recordista", nome: "Além do Limite", rar: "comum", desc: "Bater o primeiro recorde pessoal.", prog: c => [c.recordes, 1] },
  { id: "despertou", nome: "Aquele que Despertou", rar: "raro", desc: "Uma semana perfeita: todas as missões, sem falta.", prog: c => [c.semanas, 1] },
  { id: "punho-ferro", nome: "Punho de Ferro", rar: "raro", desc: "1.000 flexões no total.", prog: c => [c.t.flexoes, 1000] },
  { id: "pernas-aco", nome: "Pernas de Aço", rar: "raro", desc: "2.500 agachamentos no total.", prog: c => [c.t.agachamentos, 2500] },
  { id: "vontade", nome: "Vontade Inquebrável", rar: "raro", desc: "Vencer 10 impulsos.", prog: c => [c.impulsos, 10] },
  { id: "desbravador", nome: "Desbravador de Dungeons", rar: "raro", desc: "Vencer a primeira Dungeon.", prog: c => [c.portoes, 1] },
  { id: "antes-sol", nome: "Antes do Sol", rar: "raro", secreto: true, desc: "10 treinos começados antes das 6h.", prog: c => [c.antes6, 10] },
  { id: "tempestade", nome: "Caçador da Tempestade", rar: "raro", secreto: true, desc: "3 treinos em dia de chuva forte.", prog: c => [c.chuva, 3] },
  // ---- a jornada do Necromante (só aparecem para quem é da classe) ----
  { id: "aprendiz-sombras", nome: "Aprendiz das Sombras", rar: "comum", classe: "necromante", desc: "Escolher a classe Necromante.", cond: c => c.classe === "necromante" },
  { id: "ergue-mortos", nome: "Aquele que Ergue os Mortos", rar: "raro", classe: "necromante", desc: "Extrair a primeira sombra.", prog: c => [c.sombras, 1] },
  { id: "guarda-carmesim", nome: "Senhor da Guarda Carmesim", rar: "raro", classe: "necromante", desc: "Ter O Carmesim no exército.", cond: c => c.cmdD },
  { id: "comandante-sombras", nome: "Comandante de Sombras", rar: "raro", classe: "necromante", desc: "10 sombras no exército.", prog: c => [c.sombras, 10] },
  { id: "senhor-cavaleiros", nome: "Senhor dos Cavaleiros Negros", rar: "epico", classe: "necromante", desc: "5 Cavaleiros no exército.", prog: c => [c.cavaleiros, 5] },
  { id: "matador-chefes", nome: "Matador de Chefes", rar: "epico", desc: "Vencer 3 Testes de Rank.", prog: c => [c.testes, 3] },
  { id: "lamina-incansavel", nome: "Lâmina que Não Descansa", rar: "epico", desc: "60 missões seguidas sem falta.", prog: c => [c.streak, 60] },
  { id: "quebra-portoes", nome: "Quebrador de Dungeons", rar: "epico", desc: "Vencer 5 Dungeons.", prog: c => [c.portoes, 5] },
  { id: "incansavel", nome: "O Incansável", rar: "epico", desc: "100 km no total (corrida, caminhada, bike).", prog: c => [c.t.km, 100] },
  { id: "sem-limites", nome: "Quebrador de Limites", rar: "epico", desc: "20 recordes pessoais.", prog: c => [c.recordes, 20] },
  { id: "senhor-sombras", nome: "Senhor das Sombras", rar: "epico", classe: "necromante", desc: "Um Comandante e 25 sombras no exército.", cond: c => c.comandantes >= 1 && c.sombras >= 25, prog: c => [c.sombras, 25] },
  { id: "senhor-portoes", nome: "Senhor das Dungeons", rar: "lendario", desc: "Vencer 20 Dungeons.", prog: c => [c.portoes, 20] },
  { id: "portao-vermelho", nome: "Sobrevivente da Red Dungeon", rar: "lendario", desc: "Vencer 3 Red Dungeons.", prog: c => [c.vermelhos, 3] },
  { id: "dez-mil", nome: "Dez Mil Golpes", rar: "lendario", desc: "10.000 flexões no total.", prog: c => [c.t.flexoes, 10000] },
  { id: "monstro-disciplina", nome: "Monstro da Disciplina", rar: "lendario", desc: "180 missões seguidas sem falta.", prog: c => [c.streak, 180] },
  { id: "exercito-silencioso", nome: "General do Exército Silencioso", rar: "lendario", classe: "necromante", desc: "3 Comandantes no exército.", prog: c => [c.comandantes, 3] },
  { id: "mil-soldados", nome: "Rei dos Mil Soldados", rar: "mitico", classe: "necromante", desc: "As 100 sombras do Registro (o exército completo).", prog: c => [c.sombras, 100] },
  { id: "transcendeu", nome: "Aquele que Transcendeu", rar: "mitico", desc: "Chegar ao nível 100.", prog: c => [c.nivel, 100] },
  { id: "monarca-sombras", nome: "Monarca das Sombras", rar: "mitico", classe: "necromante", desc: "Rank S como Necromante.", cond: c => c.classe === "necromante" && c.rankIdx >= 5 },
];
export const tituloPorId = id => TITULOS.find(t => t.id === id) || null;
const cumpre = (t, c) => t.cond ? t.cond(c) : (([a, m]) => a >= m)(t.prog(c));
export const tituloAtual = () => tituloPorId(S.titulo) || null;

// Confere os títulos. Os novos entram na lista; o título exibido troca sozinho se o novo for mais raro.
export function checarConquistas() {
  const c = contexto(), novos = [];
  S.conquistas ||= {};
  for (const t of TITULOS) {
    if (S.conquistas[t.id] || (t.classe && t.classe !== S.classe) || !cumpre(t, c)) continue;
    S.conquistas[t.id] = today();
    novos.push(t);
  }
  const atual = tituloAtual();
  const melhor = [...novos].sort((a, b) => ORDEM_RAR.indexOf(b.rar) - ORDEM_RAR.indexOf(a.rar))[0];
  if (melhor && (!atual || ORDEM_RAR.indexOf(melhor.rar) > ORDEM_RAR.indexOf(atual.rar))) S.titulo = melhor.id;
  if (!S.titulo) S.titulo = "mais-fraco";
  return novos.filter(t => t.id !== "mais-fraco");
}
export const corRar = r => RAR[r]?.cor || "#9aa7b8";

// ---- atributos da Janela de Status (10 a 100; 100 = nível de Monarca) ----------------------
const media = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const escala = f => 10 + Math.round(90 * Math.max(0, Math.min(1, f)));
export function atributos() {
  const t = today();
  const metasS = { flexoes: 100, mergulhos: 50, barra: 30, agachamentos: 300, abdominais: 300, prancha: 300 };
  const forca = media(Object.entries(metasS).map(([k, m]) => Math.min(1, (pr(k) || 0) / m)));
  const kmGps = Object.values(S.days).flatMap(r => (r.extras || []).filter(e => e.gps && e.gps.tipo !== "bike").map(e => e.gps.km || 0));
  const kmMax = Math.max(pr("corrida") || 0, ...kmGps, 0);
  const p0 = S.profile?.pesoInicial, meta = weightGoal()?.alvo, pa = weightOn(t);
  const vit = p0 && meta && p0 !== meta ? (p0 - pa) / (p0 - meta) : 0;
  const ult = n => [...Array(n)].map((_, i) => addDays(t, -i - 1));
  const per = ult(30).filter(d => S.days[d]?.peso).length / 30;
  const metaK = S.profile?.metaKcal;
  const intel = metaK ? ult(30).filter(d => { const k = totalDieta(S.days[d]?.meals || mealsOf(d)).kcal; return k > 0 && k <= metaK + cotaKcal(d); }).length / 30 : 0;
  const obrig = ult(60).filter(d => isObligated(d));
  const dis = obrig.length ? obrig.filter(d => S.days[d]?.workout?.done).length / obrig.length : 0;
  return [
    { id: "FOR", nome: "Força", v: escala(forca), como: "Seus máximos de calistenia comparados às metas do rank S." },
    { id: "AGI", nome: "Agilidade", v: escala(kmMax / 42), como: `Maior distância corrida sem parar (${fmt(kmMax, 1)} km) rumo à maratona.` },
    { id: "VIT", nome: "Vitalidade", v: escala(vit), como: meta ? "Quanto do caminho até o seu peso-meta você já percorreu." : "Defina um peso-meta no Perfil." },
    { id: "PER", nome: "Percepção", v: escala(per), como: "Dias com peso registrado nos últimos 30." },
    { id: "INT", nome: "Inteligência", v: escala(intel), como: "Dias dentro da meta de calorias nos últimos 30." },
    { id: "DIS", nome: "Disciplina", v: escala(dis), como: "Missões cumpridas nos dias cobrados dos últimos 60." },
  ];
}

// ---- relatório semanal do Sistema -------------------------------------------------------------
export function relatorio(ws) {
  const we = addDays(ws, 6), dias = [...Array(7)].map((_, i) => addDays(ws, i));
  const log = S.game.log.filter(l => l.d >= ws && l.d <= we);
  const depois = S.game.log.filter(l => l.d > we).reduce((n, l) => n + l.xp, 0);
  const xpFim = S.game.xp - depois, xp = log.reduce((n, l) => n + l.xp, 0);
  const nivelDe = x => levelInfo(Math.max(0, x)).level;
  const pesos = dias.map(d => S.days[d]?.peso).filter(Boolean);
  const t = totais(we, ws), ant = totais(addDays(ws, -1), addDays(ws, -7));
  return {
    ws, we, missoes: dias.filter(d => S.days[d]?.workout?.done).length, cobradas: dias.filter(d => isObligated(d)).length,
    faltas: (S.debts || []).filter(x => x.date >= ws && x.date <= we).length,
    xp, ouro: log.reduce((n, l) => n + Math.max(0, l.gold), 0), nivelIni: nivelDe(xpFim - xp), nivelFim: nivelDe(xpFim),
    t, ant, recordes: (S.recordes || []).filter(r => r.d >= ws && r.d <= we),
    peso: pesos.length >= 2 ? pesos[pesos.length - 1] - pesos[0] : null,
    portao: S.portoes?.[ws] || null, sombras: (S.sombras || []).filter(s => s.d >= ws && s.d <= we).length,
    titulos: Object.entries(S.conquistas || {}).filter(([, d]) => d >= ws && d <= we).map(([id]) => tituloPorId(id)).filter(Boolean),
    impulsos: Object.entries(S.impulso?.dias || {}).filter(([d]) => d >= ws && d <= we).reduce((n, [, v]) => n + v, 0),
  };
}
// Relatório da semana que acabou, se ainda não foi visto (uma vez por semana, ao abrir o app)
export function relatorioPendente() {
  const atual = weekStart(), ws = addDays(atual, -7);
  if (S.relatorioVisto === atual) return null;
  if (!S.game.log.some(l => l.d >= ws && l.d < atual)) { S.relatorioVisto = atual; return null; }
  S.relatorioVisto = atual;
  return relatorio(ws);
}
