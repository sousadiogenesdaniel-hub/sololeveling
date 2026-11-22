// Orquestra as recompensas: o que acontece ao concluir a missão, o botão Impulso e a primeira inicialização.
import { S, save } from "./store.js";
import { today } from "./util.js";
import { grant, R } from "./game.js";
import { pr } from "./tracks.js";
import { abrirBau, bonus } from "./premios.js";
import { crescerSombras, invocacaoHoje, necromante, COMANDANTES } from "./sombras.js";
import { checarMarcos, checarConquistas } from "./conquistas.js";

// Depois de completeWorkout: bênçãos, invocação, Ouro do exército e equipamento, crescimento das sombras,
// marcos, títulos e o Baú do Sistema (sorteado agora; a animação só revela).
export function posMissao(w, date = today()) {
  const ev = [], linhas = [];
  if (S.buffs?.xpDobro) { ev.push(grant(R.treinoXp, 0, "Bênção do baú: XP em dobro")); delete S.buffs.xpDobro; }
  const inv = invocacaoHoje();
  if (inv?.cmd === "C") ev.push(grant(R.treinoXp, 0, `Invocação de ${COMANDANTES.C.nome}: XP em dobro`));
  const b = bonus();
  if (b.ouroSombras) ev.push(grant(0, b.ouroSombras, "O Exército das Sombras trabalhou por você"));
  if (b.ouro) ev.push(grant(0, b.ouro, "Bônus dos equipamentos"));
  if (necromante() && S.sombras?.length) linhas.push(`Suas ${S.sombras.length} sombras ganharam experiência`);
  linhas.push(...crescerSombras());
  const minimo = inv?.cmd === "S" ? "epico" : inv?.cmd === "D" ? "raro" : "comum";
  const bau = abrirBau({ sorte: b.sorteTotal + (w.hit ? 5 : 0), minimo, ouroX: inv?.cmd === "B" ? 2 : 1 });
  S.days[date].bau = { raridade: bau.raridade, premios: bau.premios, aberto: false, ...(inv ? { invocacao: inv.cmd } : {}) };
  const marcos = checarMarcos();
  const titulos = checarConquistas();
  save();
  return { ev, linhas, bau, marcos, titulos };
}

// Baú da missão de hoje ainda não aberto (o app foi fechado antes da animação)
export const bauPendente = (date = today()) => { const b = S.days[date]?.bau; return b && !b.aberto ? b : null; };
export function marcarBauAberto(date = today()) { if (S.days[date]?.bau) { S.days[date].bau.aberto = true; save(); } }

// ---- Impulso ----------------------------------------------------------------------------------
// Bateu a vontade de um vício: o Sistema dá na hora um desafio curto, ajustado aos seus máximos.
// Os 3 primeiros do dia dão XP; todos contam no contador "Impulsos vencidos".
export const IMPULSO = { xp: 15, xpPorDia: 3 };
const desafios = () => {
  const q = (k, d, min) => Math.max(min, Math.round((pr(k) || d) * .8));
  return [
    { txt: `${q("flexoes", 12, 10)} flexões`, seg: 45 },
    { txt: `${q("agachamentos", 30, 20)} agachamentos`, seg: 45 },
    { txt: `${q("abdominais", 25, 20)} abdominais`, seg: 45 },
    { txt: `${q("prancha", 40, 30)} segundos de prancha`, seg: q("prancha", 40, 30) },
    { txt: "50 polichinelos", seg: 45 },
    { txt: "20 afundos (10 em cada perna)", seg: 45 },
    { txt: "Caminhada rápida de 10 minutos, com o celular no bolso", seg: 600 },
  ];
};
export const impulso = () => (S.impulso ||= { total: 0, dias: {} });
export function novoImpulso(trocar = false) {
  const im = impulso(), lista = desafios();
  const atual = trocar && im.atual ? lista.filter(d => d.txt !== im.atual.txt) : lista;
  im.atual = { ...atual[Math.floor(Math.random() * atual.length)], inicio: Date.now(), trocou: trocar || false };
  save();
  return im.atual;
}
export function vencerImpulso() {
  const im = impulso(), a = im.atual;
  if (!a || (Date.now() - a.inicio) / 1000 < a.seg) return null;
  delete im.atual;
  im.total++; im.dias[today()] = (im.dias[today()] || 0) + 1;
  const ev = im.dias[today()] <= IMPULSO.xpPorDia ? [grant(IMPULSO.xp + bonus().impulso, 0, "Impulso vencido")] : [];
  const titulos = checarConquistas();
  save();
  return { ev, total: im.total, titulos };
}

// Primeira vez com as recompensas: marcos e títulos já conquistados entram sem festa (os corpos dos marcos ficam
// esperando a classe).
export function iniciarRecompensas() {
  if (S.recompensasV) return false;
  S.recompensasV = 1;
  checarMarcos();
  checarConquistas();
  (S.recordes || []).forEach(r => { r.visto = true; });
  save();
  return true;
}
