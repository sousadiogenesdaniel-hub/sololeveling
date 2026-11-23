// Classe do jogador e Exército das Sombras (Necromante).
// Cada feito real deixa um "corpo" (feitos.js); o Necromante extrai a sombra dele ("Levante-se!").
// Até o rank D o jogador não tem classe: os corpos ficam esperando. Passar no teste do D = mudança de classe.
import { S } from "./store.js";
import { today, uid, addDays } from "./util.js";
import { GRAUS, novoCorpo } from "./feitos.js";
import { weekStart, levelInfo, RANK_ORDER } from "./game.js";
import { bonus, darItem, arsenalMarechal, equipado } from "./premios.js";

// Todo mundo começa como Humano; a classe é o prêmio do rank D. Só o Necromante está pronto: as outras
// estão em construção (cada uma vai ter a sua coleção, como as sombras do Necromante).
export const CLASSES = [
  { id: "necromante", nome: "Necromante", ativo: true, desc: "Extrai as sombras dos seus feitos e forma um exército: soldados, elites, cavaleiros, comandantes e, um dia, o Marechal." },
  { id: "mago", nome: "Mago", ativo: false, desc: "O poder da magia." },
  { id: "guerreiro", nome: "Guerreiro", ativo: false, desc: "Força bruta." },
  { id: "assassino", nome: "Assassino", ativo: false, desc: "Velocidade e precisão." },
  { id: "tanque", nome: "Tanque", ativo: false, desc: "Aguenta tudo." },
];
export const classeAtual = () => CLASSES.find(c => c.id === S.classe) || null;
export const necromante = () => S.classe === "necromante";
// Já tem rank D (em qualquer trilha) e ainda não escolheu a classe
export const precisaEscolherClasse = () => !S.classe && levelInfo().rank !== "E";

// ---- graus e comandantes -----------------------------------------------------------------
// chance = de extrair em cada tentativa (são 3); base = poder no nível 1
export const GRAU = {
  soldado: { nome: "Soldado", base: 10, chance: .8, cor: "#7fb2ff" },
  elite: { nome: "Elite", base: 40, chance: .5, cor: "#b58cff" },
  cavaleiro: { nome: "Cavaleiro", base: 120, chance: .35, cor: "#d6e8ff" },
  comandante: { nome: "Comandante", base: 500, chance: 1, cor: "#ff2e4d" },
  marechal: { nome: "Marechal", base: 2000, chance: 1, cor: "#ffc94d" },
};
// Um comandante por rank: é o chefe do Teste de Rank. Os ainda não vencidos aparecem como "???".
export const COMANDANTES = {
  D: { nome: "O Carmesim", cor: "#ff2e4d", poder: "Guarda Carmesim", efeito: "o baú da missão de hoje é no mínimo Raro", missao: true },
  C: { nome: "O Devorador", cor: "#7dff6b", poder: "Fome Sem Fim", efeito: "o XP da missão de hoje vem em dobro", missao: true },
  B: { nome: "O Asa Negra", cor: "#3fb8ff", poder: "Voo Sobre o Tesouro", efeito: "o Ouro do baú de hoje vem em dobro", missao: true },
  A: { nome: "O General das Mil Lâminas", cor: "#ffc94d", poder: "Ordem de Ataque", efeito: "+1 tentativa em todos os corpos esperando extração", missao: false },
  S: { nome: "O Marechal das Trevas", grau: "marechal", cor: "#f4f6ff", poder: "Marcha do Monarca", efeito: "o baú da missão de hoje é no mínimo Épico", missao: true },
};

// ---- Registro das Sombras: 100 sombras com nome e número, liberadas por rank ----------------
// 65 Soldados, 20 Elites, 10 Cavaleiros, 4 Comandantes e o Marechal. O grau do catálogo é o de nascimento: Soldado
// pode evoluir para Elite e depois Cavaleiro; Elite, para Cavaleiro (o nome fica; Cavaleiro ganha "Cavaleiro" antes).
// Uma sombra de rank X só pode ser extraída com rank X ou maior: a coleção só fecha no S.
const LISTA = {
  D: { soldado: ["Brasa", "Corvo", "Vigia", "Presa", "Fumaça", "Eco", "Ferrão", "Cinza", "Grito", "Trovão", "Lince", "Garra", "Névoa", "Ferro"],
    elite: ["Serpente", "Martelo", "Uivo", "Foice"], cavaleiro: ["Fantasma"] },
  C: { soldado: ["Raiz", "Faísca", "Lobo", "Vulto", "Breu", "Sílex", "Urso", "Dente", "Faro", "Granito", "Sombra Rasa", "Açoite", "Basalto", "Bruma", "Cascalho", "Carvão", "Cicatriz"],
    elite: ["Escudo Negro", "Caçadora", "Besta", "Arauto", "Lâmina Fria"], cavaleiro: ["de Cinzas", "Errante"] },
  B: { soldado: ["Corisco", "Coruja", "Espinho", "Estilha", "Falcão", "Fenda", "Ferrugem", "Fuligem", "Geada", "Gume", "Javali", "Lasca", "Lodo", "Lume", "Malho", "Musgo"],
    elite: ["Víbora", "Sentinela", "Carrasco", "Mandíbula", "Harpia"], cavaleiro: ["do Véu", "de Ônix", "da Lua Morta"] },
  A: { soldado: ["Pedregulho", "Rocha", "Rugido", "Salitre", "Silvo", "Sopro", "Tição", "Tocha", "Trapo", "Abutre", "Chacal", "Escaravelho"],
    elite: ["Tempestade", "Algoz", "Escorpião", "Pantera"], cavaleiro: ["de Ferro Negro", "do Eclipse", "do Abismo"] },
  S: { soldado: ["Mariposa", "Tremor", "Talho", "Bigorna", "Estaca", "Poeira"], elite: ["Machado Rubro", "Grilhão"], cavaleiro: ["da Última Vigília"] },
};
export const RANKS_REG = ["D", "C", "B", "A", "S"];
export const CATALOGO = [];
for (const r of RANKS_REG) {
  for (const g of ["soldado", "elite", "cavaleiro"]) for (const nome of LISTA[r][g]) CATALOGO.push({ nome, grau: g, rank: r });
  CATALOGO.push({ nome: COMANDANTES[r].nome, grau: COMANDANTES[r].grau || "comandante", rank: r, cmd: r });
}
CATALOGO.forEach((c, i) => { c.n = i + 1; c.id = "s" + String(i + 1).padStart(3, "0"); });
export const catBase = id => CATALOGO.find(c => c.id === id);
const ri = r => RANK_ORDER.indexOf(r);
// Vagas livres de um grau de nascimento, no seu rank ou abaixo
export const vagasLivres = grau => {
  const tem = new Set(sombras().map(s => s.cat)), r = ri(levelInfo().rank);
  return CATALOGO.filter(c => !c.cmd && c.grau === grau && ri(c.rank) <= r && !tem.has(c.id));
};

export const sombras = () => (S.sombras ||= []);
export const corpos = () => (S.corpos ||= []);
// Nível: +10 XP por missão, 1 nível a cada 100 XP (10 missões), até o 30
export const NIVEL = { xpMissao: 10, porNivel: 100, max: 30, absorver: 20 };
export const nivelSombra = s => Math.min(NIVEL.max, 1 + Math.floor((s.xp || 0) / NIVEL.porNivel));
export const poderSombra = s => Math.round(GRAU[s.grau].base * (1 + (nivelSombra(s) - 1) / 10));
export const poderTotal = () => sombras().reduce((n, s) => n + poderSombra(s), 0);
export const nomeSombra = s => s.cmd ? s.nome : s.grau === "cavaleiro" ? `Cavaleiro ${s.nome}` : `${GRAU[s.grau].nome} ${s.nome}`;
export const temComandante = cmd => sombras().some(s => s.cmd === cmd) || corpos().some(c => c.cmd === cmd);

// O chefe do Teste de Rank vencido vira corpo de Comandante (o do S é o Marechal).
// Se o comandante daquele rank já é seu (ex.: venceu o D em outra trilha), vira um Cavaleiro.
export function derrotarChefe(rank) {
  const corpo = temComandante(rank)
    ? novoCorpo({ grau: "cavaleiro", origem: `Chefe do rank ${rank} (de novo)` })
    : novoCorpo({ grau: COMANDANTES[rank]?.grau || "comandante", cmd: rank, origem: `Chefe do rank ${rank}` });
  return { corpo };
}

export function escolherClasse(id) {
  const c = CLASSES.find(x => x.id === id);
  if (!c?.ativo || S.classe) return false;
  S.classe = id; S.classeEm = today();
  if (id === "necromante") darItem("manto-necromante", "Mudança de classe (rank D)");
  return true;
}

// "Levante-se!": tenta extrair a sombra de um corpo. Comandante nunca falha.
// Soldado 80%, Elite 50%, Cavaleiro 35% por tentativa (+ pontos de extração do livro equipado). 3 tentativas.
// A sombra extraída é uma vaga livre do Registro (do mesmo grau, no seu rank ou abaixo). Sem vaga livre, o corpo é
// absorvido: +20 XP para todas as sombras. Esquadrão (qtd > 1): só de Soldados, cada um tenta sozinho.
// O Marechal tem regra própria (statusMarechal): só com os 6 livros e o Manto, pode falhar e nunca vira cinzas.
export const MARECHAL = { base: .4, porFalha: .2, espera: 14 };
export function statusMarechal(c) {
  const a = arsenalMarechal();
  if (!a.ok) return { bloqueado: true, ...a };
  if (c.esperaAte && today() < c.esperaAte) return { espera: c.esperaAte };
  return { ok: true, chance: Math.min(1, MARECHAL.base + bonus().extracao / 100 + MARECHAL.porFalha * (c.falhas || 0)) };
}
export function chanceExtracao(c) {
  if (c.grau === "marechal") return statusMarechal(c).chance ?? 0;
  return Math.min(.95, GRAU[c.grau].chance + bonus().extracao / 100);
}
const novaSombra = (cat, c) => {
  const s = { id: uid(), cat: cat.id, nome: cat.nome, grau: cat.grau, cmd: cat.cmd || null, origem: c.origem, d: today(), xp: 0 };
  sombras().push(s);
  return s;
};
// O corpo vai virar sombra, ou não há vaga e ele vai ser absorvido?
export const destinoCorpo = c => c.cmd ? "sombra" : vagasLivres(c.grau).length ? "sombra" : "absorver";
export function levantar(id) {
  const c = corpos().find(x => x.id === id);
  if (!c || !necromante()) return null;
  if (c.grau === "marechal") {
    const st = statusMarechal(c);
    if (!st.ok) return { ok: false, marechal: true, ...st, corpo: c };
    if (Math.random() >= st.chance) {
      c.falhas = (c.falhas || 0) + 1; c.esperaAte = addDays(today(), MARECHAL.espera);
      return { ok: false, marechal: true, volta: c.esperaAte, corpo: c };
    }
  }
  if (c.cmd) {
    S.corpos = corpos().filter(x => x !== c);
    return { ok: true, sombra: novaSombra(CATALOGO.find(x => x.cmd === c.cmd), c) };
  }
  const qtd = c.qtd || 1;
  if (!vagasLivres(c.grau).length) { // sem vaga no Registro: o exército absorve o corpo
    S.corpos = corpos().filter(x => x !== c);
    return { ok: false, absorvido: true, corpo: c, ...crescerSombras(NIVEL.absorver * qtd) };
  }
  const novas = [];
  let restam = 0;
  for (let i = 0; i < qtd; i++) {
    const livres = vagasLivres(c.grau);
    if (!livres.length) break;
    if (Math.random() < chanceExtracao(c)) novas.push(novaSombra(livres[Math.floor(Math.random() * livres.length)], c));
    else restam++;
  }
  const sobra = qtd - novas.length - restam; // sem vaga para o resto do esquadrão
  const extra = sobra > 0 ? crescerSombras(NIVEL.absorver * sobra) : null;
  if (!restam) { S.corpos = corpos().filter(x => x !== c); return { ok: novas.length > 0, sombra: novas[0], novas, esquadrao: qtd > 1, absorvidos: sobra, ...(extra || {}) }; }
  c.qtd = restam; c.tentativas--;
  if (c.tentativas <= 0) { S.corpos = corpos().filter(x => x !== c); S.cinzas = (S.cinzas || 0) + restam; return { ok: novas.length > 0, sombra: novas[0], novas, esquadrao: qtd > 1, cinzas: true, perdidos: restam, corpo: c }; }
  return { ok: novas.length > 0, sombra: novas[0], novas, esquadrao: qtd > 1, restantes: c.tentativas, falharam: restam, corpo: c };
}

// Toda missão cumprida dá XP às sombras (1 nível a cada 10 missões). Evolução: Soldado vira Elite no nível 10 (com o
// jogador no rank C ou acima); Elite vira Cavaleiro no 20 (com o jogador no B ou acima). Devolve quem subiu de nível
// e quem evoluiu, para os avisos.
export const EVOLUI = { elite: { nivel: 10, rank: "C" }, cavaleiro: { nivel: 20, rank: "B" } };
export function crescerSombras(xp = NIVEL.xpMissao) {
  const niveis = [], evolucoes = [];
  if (!necromante()) return { niveis, evolucoes };
  const r = ri(levelInfo().rank);
  for (const s of sombras()) {
    const antes = nivelSombra(s);
    s.xp = (s.xp || 0) + xp;
    const n = nivelSombra(s);
    if (n > antes) niveis.push({ id: s.id, nome: nomeSombra(s), de: antes, para: n });
    const prox = s.grau === "soldado" ? "elite" : s.grau === "elite" ? "cavaleiro" : null;
    if (prox && n >= EVOLUI[prox].nivel && r >= ri(EVOLUI[prox].rank)) {
      const de = s.grau; s.grau = prox;
      evolucoes.push({ id: s.id, nome: s.nome, de, para: prox });
    }
  }
  return { niveis, evolucoes };
}

// Sombras de antes do Registro: ganham o número pelo nome (ou uma vaga livre do mesmo grau); sem vaga, o exército
// absorve. Os Comandantes ficam com os nomes novos.
export function migrarRegistro() {
  if (S.registroV) return null;
  S.registroV = 1;
  const usados = new Set(), sem = [];
  for (const s of sombras()) if (s.cmd) { const c = CATALOGO.find(x => x.cmd === s.cmd); s.cat = c.id; s.nome = c.nome; usados.add(c.id); }
  for (const s of sombras()) if (!s.cmd) {
    const nome = s.nome === "Sem Nome" ? "Fantasma" : s.nome;
    const c = CATALOGO.find(x => !x.cmd && x.nome === nome && !usados.has(x.id));
    if (c) { s.cat = c.id; s.nome = c.nome; usados.add(c.id); } else sem.push(s);
  }
  let absorvidos = 0;
  for (const s of sem) {
    const c = vagasLivres(s.grau === "cavaleiro" ? "cavaleiro" : s.grau).find(x => !usados.has(x.id))
      || vagasLivres("soldado").find(x => !usados.has(x.id));
    if (c) { s.cat = c.id; s.nome = c.nome; usados.add(c.id); } else { S.sombras = sombras().filter(x => x !== s); absorvidos++; }
  }
  if (absorvidos) crescerSombras(NIVEL.absorver * absorvidos);
  return { total: sombras().length, absorvidos };
}

// ---- invocação: 1 por semana do jogo -----------------------------------------------------
// Com o Anel do Domínio equipado, a invocação da semana pode chamar todos os seus Comandantes de uma vez.
export const invocacaoHoje = () => S.invocacao?.d === today() ? S.invocacao : null;
export const invocado = cmd => { const inv = invocacaoHoje(); return !!inv && (inv.cmd === cmd || (inv.cmd === "todos" && sombras().some(s => s.cmd === cmd))); };
export const podeInvocarTodos = () => equipado("anel-dominio") && comandantesSeus().length > 1 && necromante() && !invocouNaSemana()
  && !(comandantesSeus().some(s => COMANDANTES[s.cmd].missao) && S.days[today()]?.workout?.done);
export const invocouNaSemana = () => S.invocacao?.semana === weekStart();
export const comandantesSeus = () => sombras().filter(s => s.cmd);
export function podeInvocar(cmd) {
  const k = COMANDANTES[cmd];
  if (!necromante() || invocouNaSemana() || !sombras().some(s => s.cmd === cmd)) return false;
  return !(k.missao && S.days[today()]?.workout?.done); // poder da missão de hoje: só antes de concluir
}
export function invocar(cmd) {
  if (cmd === "todos" ? !podeInvocarTodos() : !podeInvocar(cmd)) return null;
  S.invocacao = { d: today(), semana: weekStart(), cmd };
  if (invocado("A")) corpos().forEach(c => { c.tentativas++; });
  return cmd === "todos" ? { nome: "Todos os Comandantes" } : COMANDANTES[cmd];
}

// ---- arte (SVG desenhado aqui mesmo: silhueta escura, aura e olhos acesos) -----------------
const ESCURO = "#04060c";
export function arteSombra({ grau, cmd } = {}, { tam = 96, bloqueado = false } = {}) {
  const k = cmd ? COMANDANTES[cmd] : null;
  const g = k?.grau || grau || "soldado";
  const cor = bloqueado ? "#5a6475" : k?.cor || GRAU[g].cor;
  const id = "sv" + uid();
  const tr = `stroke="${cor}" stroke-opacity=".38" stroke-width=".8"`;
  const fill = `fill="${ESCURO}"`;
  const atras = [], frente = [];
  if (g === "cavaleiro" || g === "comandante" || g === "marechal") {
    const capa = g === "comandante" && cmd === "D" ? `fill="${cor}" fill-opacity=".55"` : fill;
    atras.push(`<path d="M27 50 C14 70 12 95 9 118 L91 118 C88 95 86 70 73 50 Z" ${capa} ${tr}/>`);
  }
  if (g === "marechal") {
    atras.push(`<g class="asas"><path d="M25 54 C6 42 1 22 5 6 C11 26 21 38 32 46 Z" ${fill} ${tr}/><path d="M75 54 C94 42 99 22 95 6 C89 26 79 38 68 46 Z" ${fill} ${tr}/></g>`);
  }
  if (g === "soldado") {
    frente.push(`<path d="M47 16 L50 6 L53 16 Z" ${fill} ${tr}/>`,
      `<rect x="82.5" y="12" width="3" height="104" ${fill} ${tr}/><path d="M84 2 L88.5 14 L79.5 14 Z" ${fill} ${tr}/>`);
  }
  if (g === "elite") {
    frente.push(`<path d="M37.5 22 C36 13 47 8.5 58 10.5 C66 12 67.5 17.5 62.5 20.5 C54 23.5 45 23.5 37.5 22 Z" ${fill} ${tr}/>`,
      `<circle cx="43.5" cy="17" r="2.2" fill="${cor}" fill-opacity=".85"/>`,
      `<path d="M25 70 L17 94 L20.5 95 L28.5 71 Z" ${fill} ${tr}/><path d="M75 70 L83 94 L79.5 95 L71.5 71 Z" ${fill} ${tr}/>`);
  }
  if (g === "cavaleiro") {
    frente.push(`<path d="M50 11.5 C52 4 58.5 .5 66 1.5 C60 4.5 55.5 8.5 53.5 12.5 Z" fill="${cor}" fill-opacity=".7"/>`,
      `<path d="M38 33.5 C37.5 18 43 11 50 11 C57 11 62.5 18 62 33.5 L58 36.5 L42 36.5 Z" ${fill} ${tr}/>`,
      `<rect x="40.5" y="26.6" width="19" height="2.8" rx="1" fill="#000"/><line x1="50" y1="30" x2="50" y2="36" stroke="${cor}" stroke-opacity=".4" stroke-width=".8"/>`);
  }
  if (g === "cavaleiro" || g === "comandante" || g === "marechal") {
    frente.push(`<ellipse cx="27" cy="52" rx="9.5" ry="6.5" ${fill} ${tr}/><ellipse cx="73" cy="52" rx="9.5" ry="6.5" ${fill} ${tr}/>`,
      `<rect x="48" y="62" width="4" height="52" ${fill} ${tr}/><rect x="39" y="59" width="22" height="3.5" ${fill} ${tr}/><circle cx="50" cy="56" r="2.5" ${fill} ${tr}/>`);
  }
  if (g === "comandante") {
    frente.push(`<path d="M37 19.5 C36 11 43 7 51 7 C60 7 66 10.5 65 16 L62 20.5 L38.5 20.5 Z" ${fill} ${tr}/>`,
      `<rect x="38.5" y="17.6" width="23.5" height="3" fill="${cor}" fill-opacity=".85"/>`,
      `<path d="M36 20.5 L64 20.5 C61 24.5 41 24.5 36 20.5 Z" ${fill} ${tr}/>`,
      `<path d="M50.5 9.6 L51.6 12.4 L54.6 12.5 L52.2 14.3 L53.1 17.2 L50.5 15.5 L47.9 17.2 L48.8 14.3 L46.4 12.5 L49.4 12.4 Z" fill="${cor}"/>`);
  }
  if (g === "marechal") {
    frente.push(`<path class="coroa" d="M40 15 L42 6 L46 11 L50 2 L54 11 L58 6 L60 15 Z" fill="${cor}" fill-opacity=".8"/>`);
  }
  const olhos = bloqueado ? "" : `<g class="olhos"><g filter="url(#${id}g)"><ellipse cx="45.3" cy="28" rx="3" ry="1.6" fill="${cor}"/><ellipse cx="54.7" cy="28" rx="3" ry="1.6" fill="${cor}"/></g>
    <ellipse cx="45.3" cy="28" rx="1.7" ry=".8" fill="#fff" fill-opacity=".9"/><ellipse cx="54.7" cy="28" rx="1.7" ry=".8" fill="#fff" fill-opacity=".9"/></g>`;
  return `<svg class="sombra-arte" viewBox="0 0 100 120" width="${tam}" height="${Math.round(tam * 1.2)}" role="img" aria-label="${bloqueado ? "Sombra desconhecida" : esc2(k?.nome || GRAU[g].nome)}">
    <defs><radialGradient id="${id}a" cx="50%" cy="58%" r="58%"><stop offset="0" stop-color="${cor}" stop-opacity="${bloqueado ? .15 : .5}"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset=".62" stop-color="${ESCURO}"/><stop offset="1" stop-color="${ESCURO}" stop-opacity="0"/></linearGradient>
      <filter id="${id}g" x="-100%" y="-200%" width="300%" height="500%"><feGaussianBlur stdDeviation="1.8"/></filter></defs>
    <rect width="100" height="120" fill="url(#${id}a)"/>
    ${atras.join("")}
    <path d="M50 15 C57 15 61 20 61 27 C61 33 58 37 55 39 C64 41 72 46 75 53 L79 76 C80 88 74 100 70 118 L30 118 C26 100 20 88 21 76 L25 53 C28 46 36 41 45 39 C42 37 39 33 39 27 C39 20 43 15 50 15 Z" fill="url(#${id}f)" ${tr}/>
    ${frente.join("")}${olhos}</svg>`;
}
const esc2 = s => String(s).replace(/[&<>"']/g, "");
export { GRAUS };
