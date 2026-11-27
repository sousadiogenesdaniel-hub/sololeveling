// Telas do Portão (dungeon da semana) e do Impulso.
import { views, actions, refresh } from "../core.js";
import { S, save } from "../store.js";
import { esc, fmt, fmtDate, today, addDays, $ } from "../util.js";
import { header, panel, toast, confirmBox, aviso } from "../ui.js";
import { bauFx, falhaFx, celebrate, itemFx } from "../fx.js";
import { arteItem } from "../arte-itens.js";
import { RAR, SLOTS, itemBase } from "../premios.js";
import { TIPOS, PENA, portaoAberto, entrarPortao, desistirPortao, concluirPortao, minutos, NOMEADOS, NOM, nomeados, marcarNomeado, entrarNomeado, concluirNomeado, kmGps, kmGpsDesde, gpsCumprido } from "../portoes.js";
import { impulso, novoImpulso, vencerImpulso, IMPULSO } from "../recompensas.js";
import { checarConquistas } from "../conquistas.js";
import { linhaEv, mostrarTitulos } from "./recompensas-ui.js";
import { botaoCompartilhar } from "../cartao.js";

const relogio = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function historico() {
  const n = (S.dungeons || []).length;
  return `${panel("Registro de Dungeons", `<p class="small muted" style="margin-top:0">${n ? `${n} dungeon${n > 1 ? "s" : ""} vencida${n > 1 ? "s" : ""} na sua coleção.` : "As dungeons que você vencer viram cards numerados aqui."}</p>
    <a class="btn block" href="#/dungeons">Ver a coleção</a>`)}${historicoLista()}`;
}
function historicoLista() {
  const lista = Object.values(S.portoes || {}).filter(p => ["vencido", "falhou", "expirou", "ignorado"].includes(p.status)).sort((a, b) => b.ws.localeCompare(a.ws)).slice(0, 8);
  if (!lista.length) return "";
  const st = { vencido: ["ok", "Vencido"], falhou: ["bad", "Falhou"], expirou: ["muted", "Fechou sem você"], ignorado: ["bad", "Ignorado"] };
  return panel("Dungeons anteriores", `<ul class="list small">${lista.map(p => `<li><span class="num muted">${fmtDate(p.abertoEm || p.ws, { day: "2-digit", month: "2-digit" })}</span>
    <span class="grow">${TIPOS[p.tipo].nome}${p.rank ? ` · rank ${p.rank}` : ""}</span><b class="${st[p.status][0]}">${st[p.status][1]}</b></li>`).join("")}</ul>`);
}

// ---- Portões nomeados (Inferno no rank A, Trono no S) ------------------------------------------
const unTxt = (v, un) => un === "s" ? `${fmt(v)} s` : `${fmt(v)}`;
function nomeadoPanel(k) {
  const N = NOMEADOS[k], g = nomeados()[k], it = itemBase(N.item), t = today();
  if (!g) return "";
  const chance = `Chance ${Math.min(g.usadas + 1, NOM.chances)} de ${NOM.chances} no rank ${g.fase}`;
  const desafio = d => `<p class="small" style="margin-bottom:4px"><b>Força</b> (cada prova em até 2 séries somadas):</p>
    <ul class="list small">${d.itens.map((x, i) => `<li>${g.status === "ativo" ? `<input type="checkbox" data-chg="marcaNomeado" data-k="${k}" data-i="${i}" ${g.feitos?.[i] ? "checked" : ""} aria-label="${esc(x.nome)}">` : ""}
      <span class="grow">${esc(x.nome)}</span><b class="num">${unTxt(x.alvo, x.un)}</b></li>`).join("")}</ul>
    <p class="small" style="margin-bottom:4px"><b>Resistência</b> (rastreada pelo GPS do app, no mesmo dia):</p>
    <ul class="list small">${d.gps.map(x => { const feito = g.dia ? kmGps(g.dia, x.tipo) : 0;
      return `<li><span class="grow">${x.nome}</span><b class="num ${feito >= x.km ? "ok" : ""}">${g.status === "ativo" ? `${fmt(feito, 1)} / ` : ""}${x.km} km</b></li>`; }).join("")}</ul>`;
  const topo = `<p style="margin-top:0">Prêmio: <b style="color:${RAR[it.rar].cor}">${esc(it.nome)}</b> (Lendário), +${NOM.xp} XP e +${NOM.ouro} Ouro.</p>`;
  let corpo;
  if (g.status === "vencido") corpo = `<p class="ok" style="margin:0">Vencido em ${fmtDate(g.vencidoEm)}. ${esc(it.nome)} está no seu Arsenal.</p>`;
  else if (g.status === "espera") corpo = `${topo}<p class="small muted" style="margin-bottom:0">${chance}. Ele abre sem aviso; quando abrir, você terá ${NOM.escolher} dias para escolher o dia.</p>`;
  else if (g.status === "esgotado") corpo = `<p class="small muted" style="margin:0">As ${NOM.chances} chances do rank ${g.fase} acabaram. ${g.fase === "S" ? `Ele volta em ${fmtDate(g.abreEm)}.` : "Ele volta no próximo rank."}</p>`;
  else if (g.status === "aberto" || g.status === "marcado") {
    const dias = []; for (let d = t; d <= g.prazo; d = addDays(d, 1)) dias.push(d);
    corpo = `${topo}<p class="small">${chance}. ${g.status === "marcado" ? `Marcado para <b>${fmtDate(g.dia)}</b>.` : `Escolha o dia até <b>${fmtDate(g.prazo)}</b>.`} São umas 4 horas ou mais: no dia, quem entra não deve a missão diária.</p>
      ${desafio(g.desafio)}
      <div class="field" style="margin-top:10px"><label for="nm-dia-${k}">Dia da Dungeon</label><select id="nm-dia-${k}" data-chg="marcarNomeado" data-k="${k}">
        ${g.status === "aberto" ? `<option value="">Escolher…</option>` : ""}${dias.map(d => `<option value="${d}" ${g.dia === d ? "selected" : ""}>${fmtDate(d)}</option>`).join("")}</select></div>
      ${g.status === "marcado" && g.dia === t ? `<button class="btn primary block" data-act="entrarNomeado" data-k="${k}">Entrar na ${N.nome}</button>` : ""}
      <p class="small muted" style="margin-bottom:0">Faça com água e comida por perto. Sentiu dor ou tontura, pare: a chance volta em algumas semanas.</p>`;
  } else corpo = `<p style="margin-top:0">Em andamento. Marque cada prova ao terminar e rastreie a corrida e a bike em <a href="#/extras">Atividades</a>, com o GPS do app.</p>
      ${desafio(g.desafio)}<button class="btn primary block" style="margin-top:10px" data-act="concluirNomeado" data-k="${k}">Concluir a ${N.nome}</button>
      <p class="small muted" style="margin-bottom:0">Vale até a meia-noite de hoje. Concluir sem tudo feito gasta a chance.</p>`;
  return panel(N.nome, corpo, "portao").replace('class="panel portao"', `class="panel portao" style="--pc:${N.cor}"`);
}
const nomeadosHtml = () => Object.keys(NOMEADOS).map(nomeadoPanel).join("");

actions.marcarNomeado = ({ k }, el) => { if (!el.value) return; if (marcarNomeado(k, el.value)) { save(); refresh(); toast(`Marcado para ${fmtDate(el.value)}.`); } };
actions.entrarNomeado = async ({ k }) => {
  if (!await confirmBox(`Entrar na ${NOMEADOS[k].nome}`, "Hoje você não deve a missão diária. A Dungeon vale até a meia-noite; deixar passar gasta a chance.", "Entrar")) return;
  if (entrarNomeado(k)) { save(); refresh(); }
};
actions.marcaNomeado = ({ k, i }, el) => { const g = nomeados()[k]; if (!g) return; (g.feitos ||= [])[i] = el.checked; save(); };
actions.concluirNomeado = async ({ k }) => {
  const N = NOMEADOS[k], g = nomeados()[k]; if (!g) return;
  const tudo = g.desafio.itens.every((_, i) => g.feitos?.[i]) && g.desafio.gps.every(x => kmGps(g.dia, x.tipo) >= x.km);
  if (!tudo && !await confirmBox("Concluir sem tudo feito?", "Falta prova ou quilômetro no GPS. Concluir assim gasta esta chance.", "Concluir assim mesmo")) return;
  const r = concluirNomeado(k); save(); refresh();
  if (!r) return;
  if (!r.venceu) return falhaFx(`A ${N.nome.toUpperCase()} VENCEU`, "A chance volta em algumas semanas");
  const it = itemBase(r.item);
  await celebrate(r.eventos);
  await itemFx({ arte: arteItem(it, { tam: 260 }), nome: esc(it.nome), cor: RAR[it.rar].cor, sub: `${SLOTS[it.slot]} · Lendário`, lendario: true });
  await aviso(`${N.nome} vencida`, `<ul class="list">${r.eventos.map(linhaEv).join("")}</ul><p>${esc(it.nome)} agora está no seu Arsenal, e um esquadrão de 5 Soldados espera no Exército.</p>
    ${botaoCompartilhar("portao", { nome: N.nome, cor: N.cor, rank: g.fase })}`);
  await mostrarTitulos(checarConquistas()); save(); refresh();
};

views.portao = () => {
  const p = portaoAberto();
  if (!p) return `${header()}<div class="stack">${nomeadosHtml()}${panel("Dungeons", `<p style="margin-top:0">Nenhuma Dungeon aberta agora.</p>
    <p class="small muted" style="margin-bottom:0">Uma Dungeon se abre em algum dia de cada semana, sem aviso, com um desafio calculado pelos seus máximos.
    A maioria é opcional (só prêmio). A <b style="color:${TIPOS.vermelho.cor}">Red Dungeon</b> é mais difícil e, depois de entrar, não tem volta.
    A <b style="color:${TIPOS.emergencia.cor}">Dungeon de Emergência</b> é rara e obrigatória: ignorar ou falhar custa ${-PENA.emergencia.xp} XP e ${-PENA.emergencia.ouro} Ouro (sem Zona de Penalidade).</p>`)}${historico()}</div>`;
  const T = TIPOS[p.tipo], estilo = `style="--pc:${T.cor}"`;
  if (p.status === "aberto") {
    return `${header()}<div class="stack">${nomeadosHtml()}${panel(`${T.nome} · rank ${p.rank}`, `<p style="margin-top:0">Aberta até <b>${fmtDate(p.fecha)}, à meia-noite</b>. O desafio só aparece quando você entra.</p>
      <p class="small">Tempo limite: <b>${p.desafio.limite} min</b> a partir da entrada.</p>
      <p class="small">Prêmios: <b>+${T.xp} XP</b>, e o resto é surpresa: o Sistema só revela o que esta dungeon guarda quando você vencer.</p>
      ${p.tipo === "vermelho" ? `<p class="small bad">Depois de entrar, não tem volta: sair ou estourar o tempo conta como falha (${PENA.vermelho.xp} XP).</p>` : ""}
      ${p.tipo === "emergencia" ? `<p class="small warn">Obrigatória: ignorar até fechar, ou falhar, custa ${-PENA.emergencia.xp} XP e ${-PENA.emergencia.ouro} Ouro.</p>` : `<p class="small muted">Opcional: se não entrar, ela só fecha.</p>`}
      <p class="small muted">Faça aquecido, com água por perto. Não conta como a missão do dia.</p>
      <button class="btn primary block" data-act="entrarPortao">Entrar na Dungeon</button>`, "portao")}</div>`.replace('class="panel portao"', `class="panel portao" ${estilo}`);
  }
  const d = p.desafio, feitos = p.feitos || [];
  return `${header()}<div class="stack">${nomeadosHtml()}${panel(`${T.nome} · ${esc(d.titulo)}`, `<div class="timer num" id="pt-timer" style="color:${T.cor}">00:00</div>
    <p class="center small muted">Limite: ${d.limite} min</p>
    <p>${esc(d.desc)}</p>
    <ul class="list">${d.itens.map((it, i) => `<li><label class="row grow" style="margin:0;text-transform:none;letter-spacing:0;font-size:1rem;color:var(--text)">
      <input type="checkbox" data-chg="marcaPortao" data-i="${i}" ${feitos[i] ? "checked" : ""}>
      <span class="grow">${it.un === "rodada" ? esc(it.nome) : `<b class="num">${fmt(it.alvo)}${it.un === "s" ? " s" : ""}</b> ${esc(it.nome)}`}</span></label></li>`).join("")}
      ${(d.gps || []).map(g => { const feito = kmGpsDesde(g.tipo, p.inicio); return `<li><span class="grow"><b class="num">${fmt(g.km, 1)} km</b> de ${g.nome.toLowerCase()} pelo GPS <span class="small muted">(salva depois de entrar)</span></span>
        <b class="num ${feito >= g.km ? "ok" : ""}">${fmt(feito, 1)} / ${fmt(g.km, 1)}</b></li>`; }).join("")}</ul>
    ${d.gps?.length ? `<a class="btn block" href="#/extras" style="margin-top:8px">📍 Rastrear a corrida em Atividades</a>` : ""}
    <button class="btn primary block" data-act="concluirPortao" style="margin-top:10px">Concluir a Dungeon</button>
    <button class="btn ghost sm block" data-act="sairPortao" style="margin-top:8px">${p.tipo === "normal" ? "Sair (volta depois, o tempo zera)" : "Desistir (conta como falha)"}</button>`, "portao")}</div>`
    .replace('class="panel portao"', `class="panel portao" ${estilo}`);
};

let tick = null;
views.portao.after = () => {
  clearInterval(tick);
  const el = $("#pt-timer"), p = portaoAberto(); if (!el || !p?.inicio) return;
  const upd = () => {
    if (!el.isConnected) return clearInterval(tick);
    const s = minutos(p) * 60; el.textContent = relogio(s);
    el.classList.toggle("bad", s > p.desafio.limite * 60);
  };
  upd(); tick = setInterval(upd, 1000);
};

actions.entrarPortao = async () => {
  const p = portaoAberto(); if (!p) return;
  if (p.tipo !== "normal" && !await confirmBox(`Entrar: ${TIPOS[p.tipo].nome}`, p.tipo === "vermelho"
    ? `Depois de entrar não tem volta. Você terá ${p.desafio.limite} min. Falhar custa ${-PENA.vermelho.xp} XP.`
    : `Você terá ${p.desafio.limite} min. Falhar custa ${-PENA.emergencia.xp} XP e ${-PENA.emergencia.ouro} Ouro.`, "Entrar")) return;
  entrarPortao(); save(); refresh();
};
actions.marcaPortao = ({ i }, el) => { const p = portaoAberto(); if (!p) return; (p.feitos ||= [])[i] = el.checked; save(); };
actions.sairPortao = async () => {
  const p = portaoAberto(); if (!p) return;
  if (p.tipo !== "normal" && !await confirmBox("Desistir da Dungeon", "Conta como falha.", "Desistir")) return;
  const r = desistirPortao(); save(); refresh();
  if (r && !r.voltou) await resultado(r, p);
};
actions.concluirPortao = async () => {
  const p = portaoAberto(); if (!p) return;
  const todos = p.desafio.itens.every((_, i) => p.feitos?.[i]), gps = gpsCumprido(p);
  if ((!todos || !gps) && !await confirmBox("Concluir sem tudo feito?", gps ? "A Dungeon só é vencida com todos os itens feitos dentro do tempo." : "Ainda faltam quilômetros da corrida pelo GPS. Concluir assim conta como falha.", "Concluir assim mesmo")) return;
  const r = concluirPortao(todos); save(); refresh();
  await resultado(r, p);
};

async function resultado(r, p) {
  const T = TIPOS[p.tipo];
  if (!r.venceu) {
    await falhaFx(r.porTempo ? "O TEMPO ACABOU" : "A DUNGEON VENCEU", r.faltouGps ? "Faltaram quilômetros da corrida pelo GPS" : `${T.nome} · ${p.minutos ?? "—"} min`);
    if (r.eventos.length) await aviso("A Dungeon falhou", `<ul class="list">${r.eventos.map(linhaEv).join("")}</ul>`);
    return refresh();
  }
  await celebrate(r.eventos);
  if (r.item) await itemFx({ arte: arteItem(r.item, { tam: 260 }), nome: esc(r.item.nome), cor: RAR[r.item.rar].cor,
    sub: `${SLOTS[r.item.slot]} · ${RAR[r.item.rar].nome}`, lendario: r.item.rar === "lendario" });
  if (r.bau) await bauFx(r.bau.raridade, RAR[r.bau.raridade].nome, RAR[r.bau.raridade].cor, r.bau.premios);
  await aviso(`${T.nome} vencida`, `<p>Em <b>${p.minutos} min</b> (limite ${p.desafio.limite}).</p>
    <ul class="list">${r.eventos.filter(e => e.xp || e.hp).map(linhaEv).join("")}
      <li><span class="grow" style="text-align:left">${r.corpo.qtd ? `Esquadrão de ${r.corpo.qtd} Soldados` : `Corpo de ${r.corpo.grau === "cavaleiro" ? "Cavaleiro" : r.corpo.grau === "elite" ? "Elite" : "Soldado"}`}${r.esquadrao ? ` e um esquadrão de ${r.esquadrao.qtd} Soldados` : ""} esperando no Exército</span></li>
      ${r.item ? `<li><span class="grow" style="text-align:left">Arsenal: <b style="color:${RAR[r.item.rar].cor}">${esc(r.item.nome)}</b>${r.bau ? "" : " (só a joia desta vez)"}</span></li>` : ""}</ul>
    ${botaoCompartilhar("portao", { nome: T.nome, cor: T.cor, rank: p.rank, tempo: p.minutos })}`);
  await mostrarTitulos(checarConquistas()); save();
  refresh();
}

// ---- Impulso ---------------------------------------------------------------------------------
views.impulso = () => {
  const im = impulso(), a = im.atual, hoje = im.dias?.[today()] || 0;
  const xp = IMPULSO.xp;
  return `${header()}<div class="stack">${panel("Impulso", a ? `<p class="small muted" style="margin-top:0">[ MISSÃO DE EMERGÊNCIA DO SISTEMA ]</p>
      <p class="mid glow center">${esc(a.txt)}</p>
      <div class="timer num" id="im-timer">00:00</div>
      <p class="center small muted">Faça agora. O botão libera em ${a.seg >= 60 ? Math.round(a.seg / 60) + " min" : a.seg + " s"}.</p>
      <button class="btn primary block" id="im-ok" data-act="vencerImpulso" disabled>Venci o impulso</button>
      ${a.trocou ? "" : `<button class="btn ghost sm block" style="margin-top:8px" data-act="trocarImpulso">Trocar o desafio (1 vez)</button>`}`
    : `<p style="margin-top:0">Bateu a vontade de algo que você quer largar? Aperte o botão: o Sistema te dá na hora um desafio curto. A vontade vira treino.</p>
      <button class="btn primary block" data-act="gerarImpulso">⚡ Vencer um impulso agora</button>`)}
    ${panel("Impulsos vencidos", `<div class="grid2"><div class="tile"><div class="lbl">Total</div><div class="val num glow">${fmt(im.total || 0)}</div></div>
      <div class="tile"><div class="lbl">Hoje</div><div class="val num">${hoje}</div></div></div>
      <p class="small muted" style="margin-bottom:0">Os ${IMPULSO.xpPorDia} primeiros do dia valem +${xp} XP; todos contam no total e para os títulos.</p>`)}</div>`;
};
let tickIm = null;
views.impulso.after = () => {
  clearInterval(tickIm);
  const el = $("#im-timer"), a = impulso().atual; if (!el || !a) return;
  const upd = () => {
    if (!el.isConnected) return clearInterval(tickIm);
    const s = (Date.now() - a.inicio) / 1000; el.textContent = relogio(s);
    const b = $("#im-ok"); if (b) b.disabled = s < a.seg;
  };
  upd(); tickIm = setInterval(upd, 1000);
};
actions.gerarImpulso = () => { novoImpulso(); refresh(); };
actions.trocarImpulso = () => { novoImpulso(true); refresh(); };
actions.vencerImpulso = async () => {
  const r = vencerImpulso(); if (!r) return toast("Termine o desafio primeiro.");
  refresh();
  await celebrate(r.ev);
  toast(r.ev.length ? `Impulso vencido! +${r.ev[0].xp} XP · total ${r.total}` : `Impulso vencido! Total: ${r.total}`, 3500);
  await mostrarTitulos(r.titulos); save();
};
