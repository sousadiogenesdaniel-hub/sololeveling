// Recompensas: raridades, Baú do Sistema, o Arsenal (armas, livros, anéis e o Manto), o HP e a soma dos bônus.
import { S } from "./store.js";
import { today, uid } from "./util.js";
import { grant, levelInfo, isRestDay, RANK_ORDER } from "./game.js";

export const RAR = {
  comum: { nome: "Comum", cor: "#9aa7b8", ouro: 30 },
  raro: { nome: "Raro", cor: "#3fb8ff", ouro: 80 },
  epico: { nome: "Épico", cor: "#a26bff", ouro: 200 },
  lendario: { nome: "Lendário", cor: "#ffc94d", ouro: 500 },
  mitico: { nome: "Mítico", cor: "#ff2e4d", ouro: 1000 },
};
export const ORDEM_RAR = ["comum", "raro", "epico", "lendario", "mitico"];

// ---- Arsenal -----------------------------------------------------------------------------
// Coleção finita, por classe (por enquanto só o Necromante): 9 armas, 6 livros de invocação, 5 anéis e o Manto.
// Por rank: D 5 (com o Manto), C 8, B 4, A 3, S 1. Raridades: 10 Comuns, 5 Raros, 4 Épicos e 2 Lendários.
// O Manto vem com a mudança de classe; os Lendários só caem nos Portões nomeados (Inferno no A, Trono no S);
// o resto cai dos Portões. Nunca cai repetido. Um item cai em qualquer rank igual ou maior que o dele.
export const SLOTS = { arma: "Arma", livro: "Livro", anel: "Anel", manto: "Manto" };
export const ITENS = [
  { id: "manto-necromante", nome: "Manto do Necromante", slot: "manto", rank: "D", rar: "raro", cor: "#b892ff", dado: "classe",
    hist: "O Sistema entrega este manto a quem escolhe comandar os mortos. Dizem que o capuz nunca fica vazio por muito tempo." },
  { id: "adaga-coveiro", nome: "Adaga do Coveiro", slot: "arma", rank: "D", rar: "comum", cor: "#d0b98a",
    hist: "Pertenceu a um coveiro que enterrava os caçadores caídos nos primeiros Portões. Ele jurava que, à noite, alguns pediam para voltar." },
  { id: "cajado-osso", nome: "Cajado de Osso", slot: "arma", rank: "D", rar: "comum", cor: "#7fe0c8",
    hist: "Montado com ossos de feras do rank D. A pedra no topo brilha mais perto de um corpo que ainda pode se levantar." },
  { id: "grimorio-chamado", nome: "Grimório do Primeiro Chamado", slot: "livro", rank: "D", rar: "comum", cor: "#c2acf2",
    hist: "As primeiras páginas ensinam uma única palavra. Todo Necromante começa por ela." },
  { id: "anel-ferro", nome: "Anel de Ferro Negro", slot: "anel", rank: "D", rar: "comum", cor: "#a3adc6",
    hist: "Ferro forjado no fundo de um Portão sem luz. Continua frio ao toque, mesmo no verão." },
  { id: "lamina-luto", nome: "Lâmina do Luto", slot: "arma", rank: "C", rar: "comum", cor: "#a9c0e0",
    hist: "A fita preta no cabo é de alguém que não voltou. Quem a empunha luta por dois." },
  { id: "cetro-ebano", nome: "Cetro de Ébano", slot: "arma", rank: "C", rar: "comum", cor: "#a682ff",
    hist: "Madeira de uma árvore que só cresce em cemitérios. A pedra no centro pulsa como um coração lento." },
  { id: "adagas-nevoa", nome: "Adagas Gêmeas da Névoa", slot: "arma", rank: "C", rar: "raro", cor: "#7fd6ff",
    hist: "Forjadas aos pares por duas irmãs caçadoras. Quando uma corta, a névoa já escondeu a outra." },
  { id: "livro-covas", nome: "Livro das Covas Rasas", slot: "livro", rank: "C", rar: "comum", cor: "#c4a874",
    hist: "Um registro de quem foi enterrado às pressas. Cada página é um nome esperando o chamado." },
  { id: "codice-cinzas", nome: "Códice de Cinzas", slot: "livro", rank: "C", rar: "comum", cor: "#ff8a4d",
    hist: "Sobreviveu ao incêndio que levou a biblioteca inteira. As páginas ainda soltam brasas quando alguém lê." },
  { id: "tomo-juramento", nome: "Tomo do Juramento Sombrio", slot: "livro", rank: "C", rar: "raro", cor: "#7b93ff",
    hist: "As correntes não protegem o livro: protegem o mundo dele. Só abre para quem jurou não recuar." },
  { id: "anel-lua", nome: "Anel da Lua Minguante", slot: "anel", rank: "C", rar: "comum", cor: "#d6e4ff",
    hist: "Brilha mais nas noites sem lua. Lembra que o que some sempre volta." },
  { id: "anel-osso", nome: "Anel de Osso Entalhado", slot: "anel", rank: "C", rar: "comum", cor: "#e6dabb",
    hist: "Cada marca entalhada é uma sombra que aceitou servir. Ainda há espaço para mais." },
  { id: "lanca-caido", nome: "Lança do Cavaleiro Caído", slot: "arma", rank: "B", rar: "raro", cor: "#ff4d6a",
    hist: "O estandarte rasgado é o último que o cavaleiro carregou. Ele caiu; a lança, não." },
  { id: "espada-crepusculo", nome: "Espada do Crepúsculo", slot: "arma", rank: "B", rar: "epico", cor: "#ff9a5a",
    hist: "Forjada na hora em que o dia vira noite. A lâmina guarda as duas cores e não escolhe nenhuma." },
  { id: "livro-nomes", nome: "Livro dos Nomes Esquecidos", slot: "livro", rank: "B", rar: "raro", cor: "#9fd0ff",
    hist: "Guarda os nomes que o mundo esqueceu. Quando um deles é lido em voz alta, alguém responde." },
  { id: "anel-olhos", nome: "Anel dos Olhos Violeta", slot: "anel", rank: "B", rar: "epico", cor: "#b98bff",
    hist: "O olho na pedra nunca fecha. Ele vê o corpo antes que caia." },
  { id: "cajado-eclipse", nome: "Cajado do Eclipse", slot: "arma", rank: "A", rar: "epico", cor: "#ffd27a",
    hist: "Prende um eclipse que nunca termina. Enquanto a luz não volta, as sombras obedecem." },
  { id: "foice-almas", nome: "Foice das Mil Almas", slot: "arma", rank: "A", rar: "epico", cor: "#ff5a2e",
    hist: "Forjada para colher o que sobra de mil batalhas. As almas presas no cabo sussurram o nome de quem a carrega." },
  { id: "grimorio-noite", nome: "Grimório da Noite Eterna", slot: "livro", rank: "A", rar: "lendario", cor: "#93a0ff", portao: "inferno",
    hist: "Arrancado do fundo do Portão do Inferno. Ao abrir, a noite cai em volta de quem lê, mesmo ao meio-dia. Com ele, os seis livros se completam e o Marechal ouve o chamado." },
  { id: "anel-dominio", nome: "Anel do Domínio", slot: "anel", rank: "S", rar: "lendario", cor: "#ffc94d", portao: "trono",
    hist: "Forjado no Portão do Trono para governar todos os outros. Quem o usa não pede: ordena." },
].map(i => ({ classe: "necromante", ...i }));
export const itemBase = id => ITENS.find(i => i.id === id);
export const LIVROS = ITENS.filter(i => i.slot === "livro").map(i => i.id);

// Poderes: cada espaço tem um só. Arma = Ouro, anel = XP, livro = chance de extração, Manto = HP.
// O bônus vale no que se ganha (missões, Portões e baús), nunca diminui o que se perde.
export const PODER = { pct: { comum: 5, raro: 10, epico: 15, lendario: 25 }, ext: { comum: 3, raro: 5, epico: 8, lendario: 12 } };
export const efeitoTxt = b => b.slot === "arma" ? `+${PODER.pct[b.rar]}% de Ouro nas missões, Portões e baús`
  : b.slot === "anel" ? `+${PODER.pct[b.rar]}% de XP nas missões e Portões${b.id === "anel-dominio" ? " · invoca todos os seus Comandantes de uma vez" : ""}`
  : b.slot === "livro" ? `+${PODER.ext[b.rar]} pontos na chance de extração`
  : "Guarda HP: 100 HP valem um dia de folga";
export const ondeCai = b => b.dado === "classe" ? "Mudança de classe, ao virar Necromante no rank D"
  : b.portao ? `Só no ${PORTAO_NOME[b.portao]} (abre no rank ${b.rank})`
  : `${{ comum: "Portões comuns e de Emergência", raro: "Portões de Emergência e Vermelhos", epico: "Portões Vermelhos" }[b.rar]}, a partir do rank ${b.rank}`;
export const PORTAO_NOME = { inferno: "Portão do Inferno", trono: "Portão do Trono" };

export const inventario = () => (S.itens ||= []);
export const equipados = () => (S.equip ||= {});
export const possui = id => inventario().some(i => i.base === id);
export const registroItem = id => inventario().find(i => i.base === id) || null;

// Dá um item (nunca repetido). Guarda quando, de onde, nível e rank. O primeiro de cada espaço já entra equipado.
export function darItem(id, motivo) {
  const b = itemBase(id); if (!b || possui(id)) return null;
  const li = levelInfo();
  inventario().push({ id: uid(), base: id, d: today(), motivo, nivel: li.level, rank: li.rank });
  if (!equipados()[b.slot]) equipados()[b.slot] = id;
  if (b.slot === "manto") S.hp ??= 0;
  return { item: b };
}
export function equipar(id) {
  const b = itemBase(id);
  if (b && possui(id)) equipados()[b.slot] = id;
}
export const equipado = id => Object.values(equipados()).includes(id);

// Itens que ainda podem cair num Portão: da classe, não obtidos, de rank igual ou menor que o seu
export function itensDisponiveis(rar) {
  const r = RANK_ORDER.indexOf(levelInfo().rank);
  return ITENS.filter(i => i.rar === rar && !i.portao && !i.dado && i.classe === S.classe && RANK_ORDER.indexOf(i.rank) <= r && !possui(i.id));
}
// Portão comum: Comum. Emergência: Raro (40%) ou Comum. Vermelho (o mais difícil): Épico (40%) ou Raro.
// Sem item daquela raridade disponível, tenta a de baixo.
export const DROP = { normal: { chance: .3, rar: [["comum", 1]] }, emergencia: { chance: .4, rar: [["raro", .4], ["comum", .6]] },
  vermelho: { chance: .5, rar: [["epico", .4], ["raro", .6]] } };
export function sortearItemPortao(tipo) {
  const d = DROP[tipo]; if (!d || !S.classe || Math.random() >= d.chance) return null;
  let r = Math.random(), escolhida = d.rar[d.rar.length - 1][0];
  for (const [k, p] of d.rar) if ((r -= p) < 0) { escolhida = k; break; }
  const ordem = ["epico", "raro", "comum"];
  for (const k of ordem.slice(ordem.indexOf(escolhida))) {
    const pool = itensDisponiveis(k);
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  }
  return null;
}

// O Marechal só pode ser extraído com os 6 livros e o Manto no Arsenal
export function arsenalMarechal() {
  const livros = LIVROS.filter(possui).length, manto = possui("manto-necromante");
  return { livros, total: LIVROS.length, manto, ok: livros === LIVROS.length && manto };
}

// Os 17 itens provisórios (antes do Arsenal) viram Ouro; o Manto do Necromante continua.
const PROVISORIOS = { "adagas-enferrujadas": "comum", "adagas-primeiro-portao": "raro", "lamina-rubra": "epico", "espada-cacador": "epico",
  "adaga-rei-silencioso": "lendario", "lamina-monarca": "mitico", "foice-lua": "lendario", "capa-viajante": "comum", "capuz-vigia": "raro",
  "manto-noite": "epico", "manto-carmesim": "lendario", "anel-cobre": "comum", "colar-sobrevivente": "raro", "anel-impulso": "raro",
  "brinco-vontade": "epico", "selo-monarca": "lendario" };
export function migrarArsenal() {
  if (S.arsenalV) return null;
  S.arsenalV = 1;
  const velhos = inventario().filter(i => PROVISORIOS[i.base]);
  const ouro = velhos.reduce((n, i) => n + RAR[PROVISORIOS[i.base]].ouro, 0);
  S.itens = inventario().filter(i => itemBase(i.base));
  const eq = {};
  for (const [slot, id] of Object.entries(equipados())) { const b = itemBase(id); if (b && b.slot === slot && possui(id)) eq[slot] = id; }
  S.equip = eq;
  const manto = registroItem("manto-necromante");
  if (manto) { manto.rank ??= "D"; S.hp ??= 0; if (!eq.manto) eq.manto = "manto-necromante"; }
  const ev = ouro ? grant(0, ouro, `Arsenal: ${velhos.length} ${velhos.length > 1 ? "itens provisórios viraram" : "item provisório virou"} Ouro`) : null;
  return { velhos: velhos.length, ouro, ev };
}

// ---- HP (do Manto do Necromante) ----------------------------------------------------------
// +1 por missão, por Portão vencido e por dia de atividades com 250 kcal (+2 acima de 700); uma falta tira 25.
// Com 100 HP dá para trocar por um dia de folga: só no próprio dia, antes de cumprir a missão, nunca para apagar
// uma falta. Guarda no máximo 100 (uma folga por vez).
export const HP = { max: 100, folga: 100, missao: 1, portao: 1 };
export const temHp = () => typeof S.hp === "number";
export function mudarHp(n) {
  if (!temHp() || !n) return 0;
  const a = S.hp; S.hp = Math.max(0, Math.min(HP.max, a + n));
  return S.hp - a;
}
export const eventoHp = (n, motivo) => { const hp = mudarHp(n); return hp ? { xp: 0, gold: 0, motivo, hp } : null; };
export function podeFolga(date = today()) {
  if (!temHp()) return { ok: false, motivo: "O HP vem com o Manto do Necromante." };
  if (S.hp < HP.folga) return { ok: false, motivo: `Faltam ${HP.folga - S.hp} HP para um dia de folga.` };
  if (isRestDay(date)) return { ok: false, motivo: "Hoje já é dia de descanso." };
  if (S.days[date]?.workout?.done) return { ok: false, motivo: "A missão de hoje já foi cumprida." };
  return { ok: true };
}
export function usarFolga() {
  if (!podeFolga().ok) return null;
  S.hp -= HP.folga;
  (S.folgas ||= []).push(today());
  return { ...grant(0, 0, "Dia de folga: sem missão e sem penalidade hoje"), hp: -HP.folga };
}

// ---- bônus somados -----------------------------------------------------------------------
// Sombras (só do Necromante): cada Soldado +1 Ouro por missão, cada Cavaleiro +3 (até +40); cada Elite +1% de
// sorte no baú (até +10%). Equipamento: Ouro e XP em %, extração em pontos. Nada disso alivia penalidade.
export const TETO = { ouroSombras: 40, sorteSombras: 10, sorte: 25 };
export function bonus() {
  const ef = { ouroPct: 0, xpPct: 0, extracao: 0 };
  for (const id of Object.values(equipados())) {
    const b = itemBase(id); if (!b) continue;
    if (b.slot === "arma") ef.ouroPct += PODER.pct[b.rar];
    if (b.slot === "anel") ef.xpPct += PODER.pct[b.rar];
    if (b.slot === "livro") ef.extracao += PODER.ext[b.rar];
  }
  const sombras = S.classe === "necromante" ? (S.sombras || []) : [];
  const n = g => sombras.filter(s => s.grau === g).length;
  const ouroSombras = Math.min(TETO.ouroSombras, n("soldado") + 3 * n("cavaleiro"));
  const sorteSombras = Math.min(TETO.sorteSombras, n("elite"));
  return { ...ef, ouroSombras, sorteSombras, sorteTotal: Math.min(TETO.sorte, sorteSombras) };
}
// Linhas de bônus do equipamento sobre um ganho (XP e Ouro base)
export function bonusEquip(xp, ouro, onde, date = today()) {
  const b = bonus(), eq = equipados(), ev = [];
  const x = xp > 0 && b.xpPct ? Math.max(1, Math.round(xp * b.xpPct / 100)) : 0;
  const o = ouro > 0 && b.ouroPct ? Math.max(1, Math.round(ouro * b.ouroPct / 100)) : 0;
  if (x) ev.push(grant(x, 0, `${itemBase(eq.anel).nome}: +${b.xpPct}% de XP ${onde}`, date));
  if (o) ev.push(grant(0, o, `${itemBase(eq.arma).nome}: +${b.ouroPct}% de Ouro ${onde}`, date));
  return ev;
}

// ---- Baú do Sistema ----------------------------------------------------------------------
// Chances base: Comum 70% · Raro 22% · Épico 7% · Lendário 1%. "sorte" (pontos %) tira do Comum e dá 60/30/10
// para Raro/Épico/Lendário. "minimo" garante a raridade mínima (invocação, Portões). O baú dá Ouro (e às vezes a
// bênção do XP em dobro); itens do Arsenal não caem do baú.
const BASE = { comum: 70, raro: 22, epico: 7, lendario: 1 };
const ORD_BAU = ["comum", "raro", "epico", "lendario"];
export function chances(sorte = 0, minimo = "comum") {
  const p = { ...BASE }, s = Math.max(0, Math.min(sorte, 60));
  const tira = Math.min(s, p.comum);
  p.comum -= tira; p.raro += tira * .6; p.epico += tira * .3; p.lendario += tira * .1;
  const m = ORD_BAU.indexOf(minimo);
  for (let i = 0; i < m; i++) { p[ORD_BAU[m]] += p[ORD_BAU[i]]; p[ORD_BAU[i]] = 0; }
  return p;
}
export function sortearRaridade(sorte = 0, minimo = "comum") {
  const p = chances(sorte, minimo);
  let r = Math.random() * 100;
  for (const k of ORD_BAU) if ((r -= p[k]) < 0) return k;
  return ORD_BAU.filter(k => p[k] > 0).pop();
}
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// Abre um baú: sorteia e já entrega (o Ouro entra na hora; a animação só revela). A arma equipada soma a sua %.
// Devolve { raridade, premios: [texto], eventos }
export function abrirBau({ sorte = 0, minimo = "comum", ouroX = 1, motivo = "Baú do Sistema" } = {}) {
  const raridade = sortearRaridade(sorte, minimo);
  const premios = [], eventos = [];
  let ouro = 0;
  if (raridade === "comum") ouro = rnd(10, 40);
  else if (raridade === "raro") {
    if (Math.random() < .3) { (S.buffs ||= {}).xpDobro = true; premios.push("Bênção: XP em dobro na próxima missão"); ouro = 30; }
    else ouro = rnd(60, 100);
  } else if (raridade === "epico") ouro = rnd(150, 250);
  else ouro = rnd(350, 500);
  ouro = Math.round(ouro * ouroX);
  eventos.push(grant(0, ouro, `${motivo} (${RAR[raridade].nome})`));
  premios.unshift(`+${ouro} Ouro`);
  const extra = bonusEquip(0, ouro, "no baú");
  if (extra.length) { eventos.push(...extra); premios.push(`+${extra[0].gold} Ouro da arma`); }
  return { raridade, premios, eventos };
}
