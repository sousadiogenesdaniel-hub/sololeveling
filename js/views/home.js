// Início: resumo rápido do dia
import { nativeStatus } from "../native.js";
import { views } from "../core.js";
import { S } from "../store.js";
import { today, fmt, signed, addDays, daysBetween, WEEKDAYS, esc, fmtDate } from "../util.js";
import { header, panel } from "../ui.js";
import { mealsOf, totals, spent, extrasKcal, isRestDay, isObligated, inPenalty, pendingDebts, daysToShop, monthDebt, weightOn, weightGoal, cotaKcal, R } from "../game.js";
import { workoutFor, currentTrack } from "../tracks.js";

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
      return st.unlockUntil > Date.now() ? "" : `<p class="small bad">🔒 Apps bloqueados até você resolver.</p>`; })()}
    <a class="btn primary block" href="#/penalidade">Resolver penalidade</a>`, "alert");
}

function questCard() {
  const t = today(), w = S.days[t]?.workout;
  if (!S.track) return panel("Missão diária", `<p>Nenhuma trilha escolhida.</p><a class="btn primary block" href="#/treino">Escolher trilha</a>`);
  if (w?.done) return panel("Missão diária", `<p class="mid ok">✔ Concluída</p>
    <p class="muted small">${esc(w.plano.titulo)} · ${w.durMin} min · ~${w.kcal} kcal</p>`, "good");
  if (isRestDay(t) && !S.game.needsWorkout) return panel("Missão diária", `<p class="mid">Dia de descanso</p>
    <p class="muted small">Recupere-se. Amanhã o Sistema cobra de novo.</p>`);
  const plan = workoutFor(t);
  const estado = w?.in ? `<span class="chip warn">Em andamento</span>` : `<span class="chip">Pendente</span>`;
  const aviso = isObligated(t)
    ? `Se o dia virar sem o treino: ${R.faltaXp} XP, ${R.faltaOuro} Ouro e Zona de Penalidade.`
    : "Hoje ainda não vale penalidade: a cobrança começa amanhã.";
  return panel("Missão diária", `
    <p class="mid">${esc(plan.titulo)}</p>
    <p class="muted small">${currentTrack().nome} · etapa ${plan.stage}/${plan.stages} · ${plan.itens.length} exercícios · +${R.treinoXp} XP · +${R.treinoOuro} Ouro</p>
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
  const saldoTxt = `<p class="small muted">Gasto estimado hoje: <b class="num">${fmt(gasto)} kcal</b> · saldo
    <b class="num ${saldo <= 0 ? "ok" : "warn"}">${signed(saldo, 0)} kcal</b>${extrasKcal(t) ? ` · inclui ~${fmt(extrasKcal(t))} kcal de extras` : ""}
    · <a href="#/extras">${S.tracking ? "rastreando atividade…" : "fez algo a mais?"}</a></p>`;
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
    <div class="tile"><div class="lbl">Loja (sex e sáb)</div><div class="val">${dias === 0 ? `<span class="ok">Aberta hoje</span>` : `abre em ${dias} ${dias === 1 ? "dia" : "dias"}`}</div>
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
    <div class="stack">${penaltyBanner()}${questCard()}${kcalCard()}${reminders()}${statusTiles()}</div>`;
};
