// Feitos do jogador que viram recompensa: recordes pessoais e "corpos" esperando a extração de sombra.
// Só dados (sem tela), para poder ser usado por qualquer módulo sem import circular.
import { S } from "./store.js";
import { today, uid, daysBetween } from "./util.js";

// Graus de sombra, do mais fraco ao mais forte
export const GRAUS = ["soldado", "elite", "cavaleiro", "comandante", "marechal"];

// Corpo de um "inimigo derrotado" (um feito real). Fica guardado até o Necromante extrair a sombra.
// cmd = rank do chefe (só comandantes); qtd = esquadrão (só Soldados vêm mais de um de uma vez)
export function novoCorpo({ grau, origem, cmd = null, qtd = 1 }) {
  const c = { id: uid(), grau, origem, d: today(), tentativas: 3, ...(cmd ? { cmd } : {}), ...(qtd > 1 && grau === "soldado" ? { qtd } : {}) };
  (S.corpos ||= []).push(c);
  return c;
}

// Recorde pessoal: chamado pelo setPR quando um máximo supera o melhor histórico.
// Gera um corpo de Soldado (no máximo um por prova a cada 7 dias, para não dar para "farmar").
export function registrarRecorde(key, nome, de, para) {
  (S.recordes ||= []).push({ d: today(), key, nome, de, para });
  const ultimo = (S.corpoRecorde ||= {})[key];
  let corpo = null;
  if (!ultimo || daysBetween(ultimo, today()) >= 7) {
    S.corpoRecorde[key] = today();
    corpo = novoCorpo({ grau: "soldado", origem: `Recorde: ${nome} ${de} → ${para}` });
  }
  return { key, nome, de, para, corpo };
}

// Recordes novos desde a última vez que a tela mostrou (para a animação "Novo recorde!")
export function recordesNaoVistos() {
  const r = (S.recordes || []).filter(x => !x.visto);
  r.forEach(x => { x.visto = true; });
  return r;
}
