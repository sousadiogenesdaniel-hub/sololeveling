// Início: resumo rápido do dia
import { nativeStatus, atualizacao } from "../native.js";
import { views, actions, refresh } from "../core.js";
import { S } from "../store.js";
import { today, fmt, signed, addDays, daysBetween, WEEKDAYS, esc, fmtDate } from "../util.js";
import { header, panel } from "../ui.js";
import { mealsOf, totals, spent, gastoPartes, isRestDay, isObligated, inPenalty, pendingDebts, daysToShop, monthDebt, weightOn, weightGoal, cotaKcal, R, condicaoPendente } from "../game.js";
import { workoutFor, currentTrack } from "../tracks.js";
import { portaoAberto, TIPOS, NOMEADOS, nomeados } from "../portoes.js";
import { podeFolga, HP } from "../premios.js";
import { bauPendente } from "../recompensas.js";
import { abrirBauAnimado } from "./recompensas-ui.js";
import { janelaStatus } from "./titulos.js";

// Portão aberto (ou em andamento) e baú da missão ainda fechado
function portaoCard() {
  const p = portaoAberto(); if (!p) return "";
  const T = TIPOS[p.tipo];
  return panel(p.status === "ativo" ? "Dungeon em andamento" : "Uma Dungeon se abriu", `<p class="mid" style="color:${T.cor};margin-top:0">${T.nome} · rank ${p.rank}</p>
    <p class="small muted">${p.status === "ativo" ? "Você está dentro. Volte e conclua antes do tempo acabar."
      : `Fecha em ${fmtDate(p.fecha, { day: "2-digit", month: "2-digit" })} à meia-noite. ${p.tipo === "emergencia" ? "Obrigatória." : "Opcional: só prêmio."}`}</p>
    <a class="btn primary block" href="#/portao">${p.status === "ativo" ? "Voltar à Dungeon" : "Ver a Dungeon"}</a>`, "portao").replace('class="panel portao"', `class="panel portao" style="--pc:${T.cor}"`);
}
// Portão do Inferno / do Trono esperando a escolha do dia, ou marcado para hoje
function nomeadoCard() {
  const t = today();
  return Object.entries(NOMEADOS).map(([k, N]) => {
    const g = nomeados()[k];
    if (!g || !(g.status === "aberto" || g.status === "ativo" || (g.status === "marcado" && g.dia === t))) return "";
    const txt = g.status === "aberto" ? `Escolha o dia até ${fmtDate(g.prazo, { day: "2-digit", month: "2-digit" })}.` : g.status === "ativo" ? "Você está dentro: conclua até a meia-noite." : "É hoje. Hoje você não deve a missão diária se entrar.";
    return panel(N.nome, `<p class="small" style="margin-top:0">${txt}</p><a class="btn primary block" href="#/portao">${g.status === "aberto" ? "Escolher o dia" : "Ir à Dungeon"}</a>`, "portao")
      .replace('class="panel portao"', `class="panel portao" style="--pc:${N.cor}"`);
  }).join("");
}
// 100 HP do Manto: dá para trocar por um dia de folga hoje
function folgaCard() {
  if (!podeFolga().ok) return "";
  return panel("Dia de folga disponível", `<p class="small" style="margin-top:0">O seu Manto chegou a <b class="hpv">${HP.folga} HP</b>. Dá para usar hoje um dia sem missão e sem penalidade, ou guardar para quando precisar.</p>
    <a class="btn block" href="#/arsenal">Ver no Arsenal</a>`);
}
function atualizacaoCard() {
  const a = atualizacao; if (!a) return "";
  return panel("App Android desatualizado", `<p style="margin-top:0">Instalado: <b>${esc(a.instalada)}</b> · disponível: <b class="glow">${esc(a.nova)}</b></p>
    <a class="btn primary block" href="${a.url}">Baixar a ${esc(a.nova)}</a>
    <p class="small muted" style="margin-bottom:0">Na lista de downloads, abra o arquivo <b>mais recente</b> (se puder, apague os o-sistema*.apk antigos antes). Ao instalar a versão nova, o Android costuma checar a segurança de novo. Se não checar, provavelmente é o arquivo antigo.</p>`, "alert");
}
function bauCard() {
  if (!bauPendente()) return "";
  return panel("Baú do Sistema", `<p style="margin-top:0">O baú da missão de hoje ainda está fechado.</p><button class="btn primary block" data-act="abrirBauHoje">Abrir o baú</button>`);
}
actions.abrirBauHoje = () => abrirBauAnimado().then(refresh);

function penaltyBanner() {
  if (!inPenalty()) return "";
  const debts = pendingDebts().length;
  const steps = [];
  if (debts) steps.push(`Pagar a multa por PIX e enviar os comprovantes (${debts} falta${debts > 1 ? "s" : ""})`);
  if (S.game.needsWorkout) steps.push("Concluir um treino para se redimir");
  return panel("Zona de Penalidade", `
    <p>Você falhou na missão diária. O Sistema permanecerá em alerta até você cumprir:</p>
    <ul>${steps.map(s => `<li>${s}</li>`).join("")}</ul>
    <p class="small muted">Enquanto houver multa pendente, você perde ${-R.corrosaoXp} XP por dia e a Loja fica trancada.</p>
    ${(() => { const st = nativeStatus(); if (!st) return "";
      if (!st.blockingEnabled) return `<p class="small warn">⚠ O bloqueio de apps está desligado.</p>`;
      if (!st.usageAccess || !st.overlay) return `<p class="small warn">⚠ O bloqueio de apps está sem permissão. <a href="#/bloqueio">Resolver</a></p>`;
      return (st.unlockFrom || 0) <= Date.now() && st.unlockUntil > Date.now() ? `<p class="small warn">Emergência: apps liberados até ${new Date(st.unlockUntil).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.</p>` : `<p class="small bad">🔒 Apps bloqueados até você resolver.</p>`; })()}
    <a class="btn primary block" href="#/penalidade">Resolver penalidade</a>`, "alert");
}

function questCard() {
  const t = today(), w = S.days[t]?.workout;
  if (!S.track) return panel("O Sistema está esperando", `<p style="margin-top:0">Escolha uma trilha para o jogo começar. Até lá, nenhuma missão é cobrada.</p>
    <a class="btn primary block" href="#/treino">Escolher a trilha</a>`, "portao");
  if (w?.done) return panel("Missão diária", `<p class="mid ok">✔ Concluída</p>
    <p class="muted small">${esc(w.plano.titulo)} · ${w.durMin} min · ~${w.kcal} kcal</p>`, "good");
  if (isRestDay(t) && !S.game.needsWorkout) return panel("Missão diária", `<p class="mid">Dia de descanso</p>
    <p class="muted small">Recupere-se. Amanhã o Sistema cobra de novo.</p>`);
  const plan = w?.in ? w.plano : S.days[t]?.modo ? { titulo: S.days[t].modo === "avaliacao" ? "Dia de Avaliação" : "Dia de Teste de Rank", modo: true } : workoutFor(t);
  const estado = w?.in ? `<span class="chip warn">Em andamento</span>` : `<span class="chip">Pendente</span>`;
  const aviso = isObligated(t)
    ? `Se o dia virar sem o treino: ${R.faltaXp} XP, ${R.faltaOuro} Ouro e Zona de Penalidade.`
    : "Hoje ainda não vale penalidade: a cobrança começa amanhã.";
  return panel("Missão diária", `
    <p class="mid">${esc(plan.titulo)}</p>
    <p class="muted small">${currentTrack().nome} · ${plan.modo ? "dia especial" : `etapa ${plan.stage}/${plan.stages} · ${plan.itens.length} exercícios`} · +${R.treinoXp} XP · +${R.treinoOuro} Ouro</p>
    <p class="small ${isObligated(t) ? "warn" : "muted"}">${aviso}</p>
    <a class="btn primary block" href="#/treino">${w?.in ? "Continuar treino" : "Ir para a missão"}</a>`, "", estado);
}

function kcalCard() {
  const t = today(), tot = totals(mealsOf(t)), meta = S.profile.metaKcal, gasto = spent(t);
  const macros = `<div class="grid3" style="margin-top:12px">
    <div class="tile"><div class="lbl">Proteína</div><div class="val num">${fmt(tot.p)} g</div></div>
    <div class="tile"><div class="lbl">Carbo</div><div class="val num">${fmt(tot.c)} g</div></div>
    <div class="tile"><div class="lbl">Gordura</div><div class="val num">${fmt(tot.gord)} g</div></div></div>`;
  const saldo = tot.kcal - gasto;
  // o gasto é a soma de tudo: repouso, missão, atividades extras, Dungeon de Campo, as outras dungeons e os impulsos
  const g = gastoPartes(t), partes = [["repouso", g.repouso], ["missão", g.missao], ["extras", g.extras], ["Dungeon de Campo", g.campo],
    ["dungeons", g.dungeons], ["impulsos", g.impulsos]].filter(([, v]) => v > 0).map(([n, v]) => `${n} ~${fmt(v)}`).join(" + ");
  const saldoTxt = `<p class="small muted">Gasto estimado hoje: <b class="num">${fmt(gasto)} kcal</b> · saldo
    <b class="num ${saldo <= 0 ? "ok" : "warn"}">${signed(saldo, 0)} kcal</b>
    · <a href="#/extras">${S.tracking ? (S.tracking.campo ? "na Dungeon de Campo…" : "rastreando atividade…") : "fez algo a mais?"}</a></p>
    <p class="small muted" style="margin-top:-6px">${partes}</p>`;
  if (!meta) return panel("Calorias", `<p>Consumido hoje: <b class="num">${fmt(tot.kcal)} kcal</b></p>${saldoTxt}
    <p class="small muted">Defina uma meta de calorias no Perfil para ver quanto ainda pode comer.</p>${macros}`);
  const cota = cotaKcal(t), limite = meta + cota;
  const rest = limite - tot.kcal, pct = Math.min(100, tot.kcal / limite * 100);
  return panel("Calorias", `<div class="row">
    <div class="ring ${rest < 0 ? "over" : ""}" style="--p:${pct}"><div><div>
      <div class="mid num ${rest < 0 ? "bad" : "glow"}">${fmt(Math.abs(rest))}</div>
      <div class="small muted">${rest < 0 ? "kcal acima" : "kcal restantes"}</div></div></div></div>
    <div class="grow">
      <p style="margin:0 0 6px">${rest >= 0 ? `Você ainda pode consumir <b class="glow num">${fmt(rest)} kcal</b> hoje.` : `Você passou <b class="bad num">${fmt(-rest)} kcal</b> da meta.`}</p>
      <p class="small muted" style="margin:0">Consumido <b class="num">${fmt(tot.kcal)}</b> de <b class="num">${fmt(limite)}</b> kcal${cota ? ` <span class="gold">(inclui ${fmt(cota)} da Loja)</span>` : ""}</p>
      ${saldoTxt}
    </div></div>${macros}
    <p class="small muted" style="margin-bottom:0">Conta a dieta padrão inteira do dia. Comeu diferente? <a href="#/comida">Ajuste em Comida</a>.
      O Sistema confere no dia seguinte: dentro da meta +${R.kcalXp} XP; mais de ${R.dietaTolerancia} kcal acima, −${R.dietaPor100} XP e −${R.dietaPor100} Ouro a cada 100 kcal.</p>`);
}

function reminders() {
  const t = today(), d = S.days[t] || {}, items = [];
  if (!d.peso || !d.abdomen) items.push(["Registrar peso e abdômen de hoje", `+${R.medidasXp} XP`, "medidas"]);
  if (condicaoPendente(addDays(t, -1))) items.push(["Registrar a Condição de ontem", `+${R.condicaoXp} XP`, "condicao/ontem"]);
  const lastW = Object.keys(S.weekly).sort().pop();
  if (!lastW || daysBetween(lastW, t) >= 7) items.push(["Medidas semanais pendentes", `+${R.semanalXp} XP`, "medidas/semanal"]);
  const lastPhoto = S.lastPhoto;
  if (!lastPhoto || daysBetween(lastPhoto, t) >= 7) items.push(["Fotos da semana pendentes", "", "fotos"]);
  if (!S.profile.home?.acc) items.push(["Cadastrar a localização da sua casa (para o ponto)", "", "perfil"]);
  if (S.track && !(S.pr && Object.keys(S.pr).length)) items.push(["Fazer o Teste de Avaliação: seus máximos ajustam os treinos", "", "avaliacao"]);
  if (!items.length) return "";
  return panel("Lembretes", `<ul class="list">${items.map(([txt, bonus, rota]) => `<li>
    <span class="grow">${txt} <span class="small ok">${bonus}</span></span>
    <a class="btn sm" href="#/${rota}">Registrar</a></li>`).join("")}</ul>`);
}

function statusTiles() {
  const t = today(), g = S.game, dias = daysToShop(t);
  const peso = S.days[t]?.peso ?? weightOn(t);
  const antes = weightOn(addDays(t, -7));
  const delta = peso - antes;
  const goal = weightGoal();
  let metaVal = "—", metaSub = "Defina no Perfil";
  if (goal) {
    const faixa = goal.margem ? `${fmt(goal.piso)}–${fmt(goal.teto)} kg` : `${fmt(goal.alvo, 1)} kg`;
    if (peso > goal.teto) { metaVal = fmt(peso - goal.teto, 1) + " kg"; metaSub = goal.margem ? `para entrar na faixa (${faixa}) · ${fmt(peso - goal.alvo, 1)} até ${fmt(goal.alvo)}` : `Meta: ${faixa}`; }
    else if (peso < goal.piso) { metaVal = `<span class="warn">Abaixo</span>`; metaSub = `da faixa ${faixa}`; }
    else { metaVal = `<span class="ok">Na faixa ✔</span>`; metaSub = `${faixa} · alvo ${fmt(goal.alvo)} kg`; }
  }
  const pizza = [...S.shop].sort((a, b) => b.custo - a.custo)[0];
  const md = monthDebt();
  return `<div class="grid2">
    <div class="tile"><div class="lbl">Sequência</div><div class="val num">🔥 ${g.streak} ${g.streak === 1 ? "treino" : "treinos"}</div><div class="small muted">Recorde: ${g.bestStreak}</div></div>
    <div class="tile"><div class="lbl">Loja (sex a dom)</div><div class="val">${dias === 0 ? `<span class="ok">Aberta hoje</span>` : `abre em ${dias} ${dias === 1 ? "dia" : "dias"}`}</div>
      <div class="small muted">${pizza ? `${pizza.icone} ${esc(pizza.nome)}: ${g.gold >= pizza.custo ? "você já pode comprar" : `faltam ${fmt(pizza.custo - g.gold)} de Ouro`}` : ""}</div></div>
    <div class="tile"><div class="lbl">Peso</div><div class="val num">${fmt(peso, 1)} kg</div>
      <div class="small ${delta <= 0 ? "ok" : "warn"}">${signed(delta)} kg em 7 dias</div></div>
    <div class="tile"><div class="lbl">Até a meta</div><div class="val num">${metaVal}</div>
      <div class="small muted">${metaSub}</div></div>
  </div>${md.faltas ? `<p class="small bad center">Multas deste mês: ${md.faltas} falta${md.faltas > 1 ? "s" : ""} = R$ ${fmt(md.total, 2)}${md.pago ? ` · pago R$ ${fmt(md.pago, 2)}` : ""}</p>` : ""}`;
}

views.inicio = () => {
  const t = today();
  return `${header()}
    <p class="small muted" style="margin-top:-6px">${WEEKDAYS[new Date(t + "T12:00").getDay()]}, ${fmtDate(t, { day: "numeric", month: "long" })}</p>
    <div class="stack">${atualizacaoCard()}${penaltyBanner()}${nomeadoCard()}${portaoCard()}${bauCard()}${folgaCard()}${questCard()}${kcalCard()}${reminders()}
      <a class="btn ghost block" href="#/impulso">⚡ Bateu a vontade? Vença um impulso</a>
      ${panel("Janela de Status", janelaStatus())}${statusTiles()}</div>`;
};
