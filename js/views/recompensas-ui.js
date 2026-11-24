// Sequências de telas das recompensas (cada passo espera o anterior fechar).
import { go, refresh } from "../core.js";
import { S, save } from "../store.js";
import { today, esc, fmt, iso } from "../util.js";
import { aviso, modal, closeModal, toast } from "../ui.js";
import { celebrate, bauFx, recordeFx, tituloFx, portaoFx, itemFx, evolucaoFx, missaoFx } from "../fx.js";
import { arteItem } from "../arte-itens.js";
import { levelInfo, grant } from "../game.js";
import { RAR, itemBase, migrarArsenal, possui, HP } from "../premios.js";
import { CLASSES, escolherClasse, precisaEscolherClasse, corpos, sombras, migrarRegistro, arteSombra, GRAU } from "../sombras.js";
import { checarConquistas, relatorioPendente } from "../conquistas.js";
import { recordesNaoVistos } from "../feitos.js";
import { bauPendente, marcarBauAberto, iniciarRecompensas } from "../recompensas.js";
import { atualizarPortoes, TIPOS, atualizarNomeados, NOMEADOS, NOM } from "../portoes.js";
import { botaoCompartilhar } from "../cartao.js";
import { nativo, temToque, toqueStatus, toqueCobrancas, syncNative, conferirAtualizacao, atualizacao } from "../native.js";

// Toque de recolher (20h às 8h, app Android 1.8+): lança no jogo o que foi pago no vigia, apresenta o recurso uma
// vez e, entre 5h e 8h, pergunta se já quer liberar os apps. Devolve true se mostrou algo.
async function toqueDeRecolher() {
  if (!temToque()) return false;
  let mostrou = false;
  const cob = toqueCobrancas();
  if (cob.length) {
    const evs = cob.map(c => grant(-c.xp, -c.ouro, `Toque de recolher: ${c.app}, ${c.min} min`, iso(new Date(c.t))));
    save(); nativo.toqueConfirmar(JSON.stringify(cob.map(c => c.id))); syncNative();
    await celebrate(evs);
    await aviso("Toque de recolher", `<p>Você pagou para usar apps durante o toque de recolher:</p><ul class="list">${evs.map(linhaEv).join("")}</ul>`);
    mostrou = true;
  }
  const st = toqueStatus(); if (!st) return mostrou;
  if (!S.toqueApresentado) {
    S.toqueApresentado = true; save();
    await aviso("Toque de recolher", `<p>Todo dia, das <b>20h às 8h</b>, os apps de vício (os da Zona de Penalidade e o Chrome) custam Ouro e XP para usar.</p>
      <ul class="list small"><li><span class="grow" style="text-align:left">${15} min por vez: 20 Ouro + 20 XP, e o preço dobra a cada vez na mesma noite (40, 80…). Sem saldo, não libera.</span></li>
      <li><span class="grow" style="text-align:left">Na tela do bloqueio dá para <b>vencer o impulso</b> (+XP) em vez de pagar.</span></li>
      <li><span class="grow" style="text-align:left">Depois das <b>5h</b>, ao abrir O Sistema, você pode liberar a manhã.</span></li>
      <li><span class="grow" style="text-align:left">Desligar leva 24 horas (na tela Bloqueio de apps).</span></li></ul>`);
    mostrou = true;
  }
  if (st.ativo && st.manha && !st.manhaLiberada && S.toqueManha !== today()) {
    S.toqueManha = today(); save();
    const liberar = await new Promise(res => {
      const o = modal(`<div class="ptitle"><span class="bang">!</span><h2>Bom dia, caçador</h2></div>
        <p class="center">O toque de recolher vai até as <b>8h</b>. Quer liberar os apps agora?</p>
        <div class="row"><button class="btn ghost grow" data-close>Esperar até as 8h</button><button class="btn primary grow" id="tq-lib">Liberar agora</button></div>`,
        { sys: true, onEnd: () => res(false) });
      o.querySelector("#tq-lib").onclick = () => { o._fim = null; o.remove(); res(true); };
    });
    if (liberar) toast(nativo.toqueLiberarManha() ? "Apps liberados até as 20h." : "Não deu para liberar agora.", 3500);
    mostrou = true;
  }
  return mostrou;
}

export const linhaEv = e => {
  const parts = [];
  if (e.xp) parts.push(`<b class="${e.xp > 0 ? "ok" : "bad"}">${e.xp > 0 ? "+" : ""}${e.xp} XP</b>`);
  if (e.gold) parts.push(`<b class="${e.gold > 0 ? "gold" : "bad"}">${e.gold > 0 ? "+" : ""}${e.gold} Ouro</b>`);
  if (e.hp) parts.push(`<b class="hpv">${e.hp > 0 ? "+" : ""}${e.hp} HP</b>`);
  return `<li><span class="grow" style="text-align:left">${esc(e.motivo)}</span><span class="num">${parts.join(" ")}</span></li>`;
};
const linhaTxt = t => `<li><span class="grow" style="text-align:left">${esc(t)}</span></li>`;

// Missão concluída: animação da missão → comemoração de nível/rank → janela da missão → Baú → títulos → classe
export async function telaMissaoConcluida(events, pos, w = null) {
  const todos = [...events, ...pos.ev];
  if (w) await missaoFx(w);
  await celebrate(todos);
  const li = levelInfo();
  const corposNovos = pos.marcos.length;
  await aviso("Missão diária concluída", `<p class="small muted" style="margin:0">[ O Sistema reconhece o seu esforço ]</p>
    <ul class="list">${todos.filter(e => e.xp || e.gold || e.hp || e.motivo).map(linhaEv).join("")}
      ${pos.linhas.map(linhaTxt).join("")}${pos.marcos.map(m => linhaTxt(`Marco: ${m.texto}`)).join("")}</ul>
    <p class="small muted">Nível ${li.level} · ${fmt(li.into)} / ${fmt(li.need)} XP${corposNovos ? ` · ${corposNovos} corpo${corposNovos > 1 ? "s" : ""} novo${corposNovos > 1 ? "s" : ""} esperando no Exército` : ""}</p>`,
    { botao: "Abrir o Baú do Sistema" });
  await abrirBauAnimado();
  await mostrarCrescimento(pos.niveis, pos.evolucoes);
  await mostrarTitulos(pos.titulos);
  await mostrarClasseSePreciso();
  refresh();
}

// Sombras que subiram de nível (uma janela só) e que evoluíram (uma animação para cada)
export async function mostrarCrescimento(niveis = [], evolucoes = []) {
  for (const e of evolucoes) {
    const s = sombras().find(x => x.id === e.id); if (!s) continue;
    await evolucaoFx({ arteDe: arteSombra({ grau: e.de }, { tam: 220 }), artePara: arteSombra(s, { tam: 220 }), nome: esc(e.nome),
      para: GRAU[e.para].nome, cor: GRAU[e.para].cor });
  }
  const sobe = niveis.filter(n => !evolucoes.some(e => e.id === n.id));
  if (sobe.length) await aviso("Seu exército cresceu", `<ul class="list small">${sobe.map(n => `<li><span class="grow" style="text-align:left">${esc(n.nome)}</span><b class="num">Nv ${n.de} → ${n.para}</b></li>`).join("")}</ul>`);
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
      : `${novos} recorde${novos > 1 ? "s" : ""}! O corpo fica guardado para quando você escolher a classe, no rank D.`, 4500);
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

// Mudança de classe: o prêmio do rank D (até lá, todo mundo é Humano)
export const listaClasses = () => CLASSES.map(c => `<div class="classe ${c.ativo ? "" : "off"}"><div class="row between"><b>${c.nome}</b>
    ${c.ativo ? (S.classe === c.id ? `<span class="chip ok">Sua classe</span>` : "") : `<span class="chip muted">Em construção</span>`}</div>
    <p class="small muted" style="margin:4px 0 0">${c.desc}</p></div>`).join("");
export function escolhaDeClasse() {
  return new Promise(res => {
    const o = modal(`<div class="ptitle"><h2>Mudança de classe</h2></div>
      <p class="small">[ AVISO DO SISTEMA ] Você conquistou o rank D e deixou de ser um simples humano. Escolha a sua classe.</p>
      ${CLASSES.map(c => `<div class="classe ${c.ativo ? "" : "off"}"><div class="row between"><b>${c.nome}</b>
        ${c.ativo ? `<button class="btn sm primary" data-classe="${c.id}">Escolher</button>` : `<span class="chip muted">Em construção</span>`}</div>
        <p class="small muted" style="margin:4px 0 0">${c.desc}</p></div>`).join("")}
      <p class="small muted">No futuro dá para trocar de classe: a nova começa do zero e a antiga fica guardada (sombras e títulos dela). Rank, nível e o resto continuam.</p>`,
      { onEnd: res });
    o.querySelectorAll("[data-classe]").forEach(b => b.onclick = async () => {
      if (!escolherClasse(b.dataset.classe)) return;
      save(); closeModal();
      await mostrarTitulos(checarConquistas());
      const n = corpos().length, manto = itemBase("manto-necromante");
      await itemFx({ arte: arteItem(manto, { tam: 260 }), nome: manto.nome, cor: RAR[manto.rar].cor, sub: "Manto · Raro", item: manto });
      await aviso("Você agora é um Necromante", `<p>Os seus feitos deixaram <b>${n} corpo${n === 1 ? "" : "s"}</b> esperando. Diga "Levante-se" e forme o seu exército.</p>
        <p class="small muted">O <b>Manto do Necromante</b> é a primeira peça do seu Arsenal: ele guarda HP (+1 por missão), e ${HP.folga} HP valem um dia de folga.
        As outras 20 peças caem dos Portões.</p>`, { botao: "Ir para o Exército" });
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
  const mig = migrarArsenal(); save();
  const reg = migrarRegistro(); save();
  const antes = !!atualizacao;
  const atual = nativo ? !!(await conferirAtualizacao()) : false;
  const { eventos, abriu } = atualizarPortoes();
  const nomeados = atualizarNomeados();
  save();
  const rel = relatorioPendente(); save();
  const toque = await toqueDeRecolher();
  const arsenal = mig && (mig.ouro || possui("manto-necromante"));
  const registro = reg && S.classe === "necromante";
  const mostrou = !!(toque || eventos.length || rel || abriu || nomeados.length || arsenal || registro || precisaEscolherClasse() || atual !== antes);
  if (registro) await aviso("Registro das Sombras", `<p>O exército agora tem <b>100 sombras com nome e número</b>: 65 Soldados, 20 Elites, 10 Cavaleiros, 4 Comandantes e o Marechal.
      As de cada rank só se levantam com você naquele rank ou acima, então o Registro só fecha no S.</p>
    <p>Elas sobem 1 nível a cada 10 missões e evoluem: Soldado → Elite → Cavaleiro.</p>
    ${reg.total ? `<p class="small muted">As suas ${reg.total} sombras já entraram no Registro${reg.absorvidos ? ` (${reg.absorvidos} sem vaga foram absorvidas pelo exército)` : ""}.</p>` : ""}`, { botao: "Ver o Registro" });
  if (!S.ritualApresentado && S.profile) {
    S.ritualApresentado = true; save();
    await aviso("Ritual do dia", `<p>Agora, na primeira abertura de cada dia, o Sistema pode lembrar <b>por que você começou</b>: a sua foto de antes, a de agora, a da meta e uma mensagem sua.</p>
      <p class="small muted">Configure em <b>Mais → Meu porquê</b>. Enquanto estiver vazio, o ritual não aparece.</p>
      <a class="btn primary block" href="#/porque" data-close>Configurar agora</a>`, { botao: "Depois" });
  }
  if (arsenal) {
    if (mig.ev) await celebrate([mig.ev]);
    await aviso("O Arsenal chegou", `${possui("manto-necromante") ? `<p>São <b>21 peças do Necromante</b> para colecionar: 9 armas, 6 livros de invocação, 5 anéis e o seu Manto. Elas caem dos Portões, nunca repetidas.</p>
      <p>O seu <b>Manto</b> agora guarda <b class="hpv">HP</b>: +1 por missão, por Portão vencido e por dia de atividades com 250 kcal. Com ${HP.folga} HP, troque por um dia de folga.</p>
      <p class="small muted">O Marechal só se levanta com os 6 livros e o Manto no Arsenal.</p>` : ""}
      ${mig.ouro ? `<p class="small">Os ${mig.velhos} itens provisórios saíram e viraram <b class="gold">+${mig.ouro} Ouro</b>.</p>` : ""}`, { botao: "Abrir o Arsenal" });
  }
  for (const k of nomeados) {
    const N = NOMEADOS[k];
    await portaoFx(N.nome, N.cor, `Escolha o dia em até ${NOM.escolher} dias · toque para continuar`);
    await aviso(N.nome, `<p>Abriu. Você tem <b>${NOM.escolher} dias</b> para escolher o dia: são umas 4 horas ou mais, com 21 km de corrida e 40 km de bike pelo GPS.</p>
      <a class="btn primary block" href="#/portao" data-close>Ver o desafio e escolher o dia</a>`, { botao: "Depois" });
  }
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
