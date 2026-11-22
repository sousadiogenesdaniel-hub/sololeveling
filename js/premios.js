// Recompensas: raridades, Baú do Sistema, equipamentos e a soma dos bônus (sombras + equipamento).
import { S } from "./store.js";
import { today, uid } from "./util.js";
import { grant } from "./game.js";

export const RAR = {
  comum: { nome: "Comum", cor: "#9aa7b8", ouro: 30 },
  raro: { nome: "Raro", cor: "#3fb8ff", ouro: 80 },
  epico: { nome: "Épico", cor: "#a26bff", ouro: 200 },
  lendario: { nome: "Lendário", cor: "#ffc94d", ouro: 500 },
  mitico: { nome: "Mítico", cor: "#ff2e4d", ouro: 1000 },
};
export const ORDEM_RAR = ["comum", "raro", "epico", "lendario", "mitico"];

// ---- equipamentos ------------------------------------------------------------------------
// Efeitos: ouro (por missão), sorte (% no baú), extracao (% de chance), impulso (XP por Impulso).
// "chefe" = cai do chefe daquele rank (Teste de Rank); "classe" = vem com a classe.
export const SLOTS = { arma: "Arma", manto: "Manto", acessorio: "Acessório" };
export const ITENS = [
  { id: "adagas-enferrujadas", nome: "Adagas Gêmeas Enferrujadas", slot: "arma", rar: "comum", ef: { ouro: 2 } },
  { id: "adagas-primeiro-portao", nome: "Adagas do Primeiro Portão", slot: "arma", rar: "raro", ef: { ouro: 5 }, chefe: "D" },
  { id: "lamina-rubra", nome: "Lâmina Rubra", slot: "arma", rar: "epico", ef: { ouro: 3, sorte: 3 } },
  { id: "espada-cacador", nome: "Espada do Caçador Desperto", slot: "arma", rar: "epico", ef: { ouro: 8 }, chefe: "C" },
  { id: "adaga-rei-silencioso", nome: "Adaga do Rei Silencioso", slot: "arma", rar: "lendario", ef: { sorte: 6, extracao: 5 }, chefe: "A" },
  { id: "lamina-monarca", nome: "Lâmina do Monarca", slot: "arma", rar: "mitico", ef: { ouro: 12, sorte: 6 }, chefe: "S" },
  { id: "foice-lua", nome: "Foice da Lua Morta", slot: "arma", rar: "lendario", ef: { ouro: 6, sorte: 4 } },
  { id: "capa-viajante", nome: "Capa de Viajante", slot: "manto", rar: "comum", ef: { ouro: 1 } },
  { id: "manto-necromante", nome: "Manto do Necromante", slot: "manto", rar: "raro", ef: { extracao: 10 }, classe: "necromante" },
  { id: "capuz-vigia", nome: "Capuz do Vigia", slot: "manto", rar: "raro", ef: { sorte: 2, ouro: 1 } },
  { id: "manto-noite", nome: "Manto da Noite Eterna", slot: "manto", rar: "epico", ef: { extracao: 5, sorte: 3 }, chefe: "B" },
  { id: "manto-carmesim", nome: "Manto Carmesim", slot: "manto", rar: "lendario", ef: { ouro: 10, extracao: 5 } },
  { id: "anel-cobre", nome: "Anel de Cobre", slot: "acessorio", rar: "comum", ef: { ouro: 1 } },
  { id: "colar-sobrevivente", nome: "Colar do Sobrevivente", slot: "acessorio", rar: "raro", ef: { sorte: 3 } },
  { id: "anel-impulso", nome: "Anel do Impulso", slot: "acessorio", rar: "raro", ef: { impulso: 5 } },
  { id: "brinco-vontade", nome: "Brinco da Vontade", slot: "acessorio", rar: "epico", ef: { sorte: 5 } },
  { id: "selo-monarca", nome: "Selo do Monarca", slot: "acessorio", rar: "lendario", ef: { sorte: 8, ouro: 8 } },
];
export const itemBase = id => ITENS.find(i => i.id === id);
export const itemDoChefe = rank => ITENS.find(i => i.chefe === rank) || null;
export const efeitoTxt = ef => [ef.ouro && `+${ef.ouro} Ouro por missão`, ef.sorte && `+${ef.sorte}% de sorte no baú`,
  ef.extracao && `+${ef.extracao}% de chance de extração`, ef.impulso && `+${ef.impulso} XP por Impulso`].filter(Boolean).join(" · ");

export const inventario = () => (S.itens ||= []);
export const equipados = () => (S.equip ||= {});
export const possui = id => inventario().some(i => i.base === id);

// Dá um item. Repetido vira Ouro. O primeiro de cada espaço já entra equipado.
export function darItem(id, motivo) {
  const b = itemBase(id); if (!b) return null;
  if (possui(id)) return { repetido: true, item: b, ev: grant(0, RAR[b.rar].ouro, `${b.nome} repetido virou Ouro`) };
  inventario().push({ id: uid(), base: id, d: today(), motivo });
  if (!equipados()[b.slot]) equipados()[b.slot] = id;
  return { item: b };
}
export function sortearItem(rars) {
  const pool = ITENS.filter(i => rars.includes(i.rar) && !i.chefe && !i.classe);
  return pool[Math.floor(Math.random() * pool.length)] || null;
}
export function equipar(id) {
  const b = itemBase(id);
  if (b && possui(id)) equipados()[b.slot] = id;
}

// ---- bônus somados -----------------------------------------------------------------------
// Sombras (só do Necromante): cada Soldado +1 Ouro por missão, cada Cavaleiro +3 (até +40); cada Elite +1% de
// sorte no baú (até +10%). Equipamentos somam os seus efeitos. Nada disso alivia penalidade.
export const TETO = { ouroSombras: 40, sorteSombras: 10, sorte: 25 };
export function bonus() {
  const ef = { ouro: 0, sorte: 0, extracao: 0, impulso: 0 };
  for (const id of Object.values(equipados())) { const b = itemBase(id); if (b) for (const k in b.ef) ef[k] += b.ef[k]; }
  const sombras = S.classe === "necromante" ? (S.sombras || []) : [];
  const n = g => sombras.filter(s => s.grau === g).length;
  const ouroSombras = Math.min(TETO.ouroSombras, n("soldado") + 3 * n("cavaleiro"));
  const sorteSombras = Math.min(TETO.sorteSombras, n("elite"));
  return { ...ef, ouroSombras, sorteSombras, ouroTotal: ef.ouro + ouroSombras, sorteTotal: Math.min(TETO.sorte, ef.sorte + sorteSombras) };
}

// ---- Baú do Sistema ----------------------------------------------------------------------
// Chances base: Comum 70% · Raro 22% · Épico 7% · Lendário 1%. "sorte" (pontos %) tira do Comum e dá 60/30/10
// para Raro/Épico/Lendário. "minimo" garante a raridade mínima (invocação, Portões).
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

// Abre um baú: sorteia e já entrega (o Ouro entra na hora; a animação só revela).
// Devolve { raridade, premios: [texto], eventos, item }
export function abrirBau({ sorte = 0, minimo = "comum", ouroX = 1, motivo = "Baú do Sistema" } = {}) {
  const raridade = sortearRaridade(sorte, minimo);
  const premios = [], eventos = [];
  let ouro = 0, item = null;
  if (raridade === "comum") ouro = rnd(10, 40);
  else if (raridade === "raro") {
    if (Math.random() < .3) { (S.buffs ||= {}).xpDobro = true; premios.push("Bênção: XP em dobro na próxima missão"); ouro = 30; }
    else ouro = rnd(60, 100);
  } else if (raridade === "epico") { ouro = rnd(150, 250); if (Math.random() < .3) item = sortearItem(["raro", "epico"]); }
  else { ouro = rnd(350, 500); item = sortearItem(["epico", "lendario"]); }
  ouro = Math.round(ouro * ouroX);
  eventos.push(grant(0, ouro, `${motivo} (${RAR[raridade].nome})`));
  premios.unshift(`+${ouro} Ouro`);
  let novo = null;
  if (item) {
    const r = darItem(item.id, motivo);
    if (r?.repetido) { premios.push(`${item.nome} (repetido) → +${RAR[item.rar].ouro} Ouro`); eventos.push(r.ev); }
    else if (r) { premios.push(`Equipamento ${RAR[item.rar].nome}: ${item.nome}`); novo = item; }
  }
  return { raridade, premios, eventos, item: novo };
}
