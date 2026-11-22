// Sequências de telas das recompensas (cada passo espera o anterior fechar).
import { go, refresh } from "../core.js";
import { S, save } from "../store.js";
import { today, esc, fmt } from "../util.js";
import { aviso, modal, closeModal, toast } from "../ui.js";
import { celebrate, bauFx, recordeFx, tituloFx, portaoFx } from "../fx.js";
import { levelInfo } from "../game.js";
import { RAR } from "../premios.js";
import { CLASSES, escolherClasse, precisaEscolherClasse, corpos } from "../sombras.js";
import { checarConquistas, relatorioPendente } from "../conquistas.js";
import { recordesNaoVistos } from "../feitos.js";
import { bauPendente, marcarBauAberto, iniciarRecompensas } from "../recompensas.js";
import { atualizarPortoes, TIPOS } from "../portoes.js";
import { botaoCompartilhar } from "../cartao.js";

export const linhaEv = e => {
  const parts = [];
  if (e.xp) parts.push(`<b class="${e.xp > 0 ? "ok" : "bad"}">${e.xp > 0 ? "+" : ""}${e.xp} XP</b>`);
  if (e.gold) parts.push(`<b class="${e.gold > 0 ? "gold" : "bad"}">${e.gold > 0 ? "+" : ""}${e.gold} Ouro</b>`);
  return `<li><span class="grow" style="text-align:left">${esc(e.motivo)}</span><span class="num">${parts.join(" ")}</span></li>`;
};
const linhaTxt = t => `<li><span class="grow" style="text-align:left">${esc(t)}</span></li>`;

// Missão concluída: comemoração de nível/rank → janela da missão → Baú → títulos → classe
export async function telaMissaoConcluida(events, pos) {
  const todos = [...events, ...pos.ev];
  await celebrate(todos);
  const li = levelInfo();
  const corposNovos = pos.marcos.length;
  await aviso("Missão diária concluída", `<p class="small muted" style="margin:0">[ O Sistema reconhece o seu esforço ]</p>
    <ul class="list">${todos.filter(e => e.xp || e.gold || e.motivo).map(linhaEv).join("")}
      ${pos.linhas.map(linhaTxt).join("")}${pos.marcos.map(m => linhaTxt(`Marco: ${m.texto}`)).join("")}</ul>
    <p class="small muted">Nível ${li.level} · ${fmt(li.into)} / ${fmt(li.need)} XP${corposNovos ? ` · ${corposNovos} corpo${corposNovos > 1 ? "s" : ""} novo${corposNovos > 1 ? "s" : ""} esperando no Exército` : ""}</p>`,
    { botao: "Abrir o Baú do Sistema" });
  await abrirBauAnimado();
  await mostrarTitulos(pos.titulos);
  await mostrarClasseSePreciso();
  refresh();
}

export async function abrirBauAnimado(date = today()) {
  const b = bauPendente(date); if (!b) return;
  marcarBauAberto(date);
  await bauFx(b.raridade, RAR[b.raridade].nome, RAR[b.raridade].cor, b.premios);
}

// Recordes ainda não comemorados (depois de salvar Avaliação ou Teste de Rank)
export async function mostrarRecordes() {
  const lista = recordesNaoVistos(); save();
  for (const r of lista.slice(0, 4)) await recordeFx(esc(r.nome), fmt(r.de), fmt(r.para));
  if (lista.length) {
    const novos = lista.length;
    toast(S.classe === "necromante" ? `${novos} recorde${novos > 1 ? "s" : ""}: corpo${novos > 1 ? "s" : ""} esperando extração no Exército.`
      : `${novos} recorde${novos > 1 ? "s" : ""}! O corpo fica guardado até você virar Necromante (rank D).`, 4500);
  }
  await mostrarTitulos(checarConquistas());
  save();
}

export async function mostrarTitulos(lista) {
  for (const t of lista) {
    await tituloFx(esc(t.nome), RAR[t.rar].nome, RAR[t.rar].cor, t.rar);
    if (t.rar === "lendario" || t.rar === "mitico" || t.rar === "epico") {
      await aviso("Título conquistado", `<p class="mid" style="color:${RAR[t.rar].cor}">${esc(t.nome)}</p><p class="small muted">${esc(t.desc)}</p>
        ${botaoCompartilhar("titulo", { nome: t.nome, rar: t.rar })}`);
    }
  }
}

// Mudança de classe (ao conquistar o rank D)
export function escolhaDeClasse() {
  return new Promise(res => {
    const o = modal(`<div class="ptitle"><h2>Mudança de classe</h2></div>
      <p class="small">[ AVISO DO SISTEMA ] Você provou o seu valor. Escolha a sua classe.</p>
      ${CLASSES.map(c => `<div class="classe ${c.ativo ? "" : "off"}"><div class="row between"><b>${c.nome}</b>
        ${c.ativo ? `<button class="btn sm primary" data-classe="${c.id}">Escolher</button>` : `<span class="chip muted">Em breve</span>`}</div>
        <p class="small muted" style="margin:4px 0 0">${c.desc}</p></div>`).join("")}
      <p class="small muted">Trocar de classe no futuro recomeça a classe do zero (sombras, poderes e títulos dela). Rank, nível e o resto ficam.</p>`,
      { onEnd: res });
    o.querySelectorAll("[data-classe]").forEach(b => b.onclick = async () => {
      if (!escolherClasse(b.dataset.classe)) return;
      save(); closeModal();
      await mostrarTitulos(checarConquistas());
      const n = corpos().length;
      await aviso("Você agora é um Necromante", `<p>Os seus feitos deixaram <b>${n} corpo${n === 1 ? "" : "s"}</b> esperando. Diga "Levante-se" e forme o seu exército.</p>
        <p class="small muted">Ganhou também o <b>Manto do Necromante</b> (+10% de chance de extração).</p>`, { botao: "Ir para o Exército" });
      save(); go("exercito");
    });
  });
}
export async function mostrarClasseSePreciso() {
  if (precisaEscolherClasse()) await escolhaDeClasse();
}

// Avisos ao abrir o app (depois do relatório do dia): Portão de Emergência ignorado, relatório semanal,
// Portão que acabou de abrir e a mudança de classe pendente.
export async function avisosDoSistema() {
  iniciarRecompensas();
  const { eventos, abriu } = atualizarPortoes();
  save();
  const rel = relatorioPendente(); save();
  const mostrou = !!(eventos.length || rel || abriu || precisaEscolherClasse());
  if (eventos.length) await aviso("Portão", `<ul class="list">${eventos.map(linhaEv).join("")}</ul>`);
  if (rel) {
    await aviso("Relatório semanal do Sistema", `<p>Semana de ${fmtD(rel.ws)} a ${fmtD(rel.we)}</p>
      <div class="grid3"><div class="tile"><div class="lbl">Missões</div><div class="val num">${rel.missoes}/${rel.cobradas}</div></div>
      <div class="tile"><div class="lbl">XP</div><div class="val num">${rel.xp >= 0 ? "+" : ""}${fmt(rel.xp)}</div></div>
      <div class="tile"><div class="lbl">Nível</div><div class="val num">${rel.nivelIni}→${rel.nivelFim}</div></div></div>
      <a class="btn block" style="margin-top:10px" href="#/relatorio/${rel.ws}" data-close>Ver relatório completo</a>`, { botao: "Fechar" });
  }
  if (abriu) await portaoFx(TIPOS[abriu.tipo].nome + " · rank " + abriu.rank, TIPOS[abriu.tipo].cor,
    abriu.tipo === "emergencia" ? "Obrigatório · fecha amanhã à meia-noite" : "Fecha amanhã à meia-noite · toque para continuar");
  await mostrarClasseSePreciso();
  return mostrou;
}
const fmtD = d => d.split("-").reverse().slice(0, 2).join("/");
