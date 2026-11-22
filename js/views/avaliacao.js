// Teste de Avaliação: o jogador mede o próprio máximo em cada prova do Teste de Rank da fase.
// Esses números viram o "Status" (progresso até a meta do rank) e calibram os treinos.
import { views, actions, go, refresh } from "../core.js";
import { S, save } from "../store.js";
import { today, addDays, daysBetween, fmt, fmtDate, num, esc } from "../util.js";
import { header, panel, sysMessage, toast } from "../ui.js";
import { currentPhase, currentTrack, testKey, pr, setPR, unitLabel } from "../tracks.js";

export const AVALIACAO_DIAS = 7;
// Data da última avaliação, por trilha (cada trilha tem as suas provas)
export function prEm(id = S.track?.id) {
  if (S.prEm) { (S.prEmT ||= {})[S.track?.id || "calistenia"] ??= S.prEm; delete S.prEm; } // antes era uma data só
  return S.prEmT?.[id] || null;
}
const marcaAvaliacao = () => { (S.prEmT ||= {})[S.track.id] = today(); };
export const avaliouHoje = () => prEm() === today();
export const proximaAvaliacao = () => prEm() ? addDays(prEm(), AVALIACAO_DIAS) : null;
// Uma avaliação por semana; no dia em que ela começou dá para salvar e corrigir as provas à vontade
const liberada = () => !prEm() || prEm() === today() || daysBetween(prEm(), today()) >= AVALIACAO_DIAS;
export const avaliacaoLiberada = liberada;

// Lista "Status": cada prova da fase com o seu máximo e a barra até a meta
export function statusList(ph) {
  return `<ul class="list small">${ph.tests.map(([n, alvo, un]) => {
    const m = pr(testKey(n)), pct = m ? Math.min(100, m / alvo * 100) : 0;
    return `<li style="display:block"><div class="row between"><span>${esc(n)}</span>
      <b class="num ${m >= alvo ? "ok" : ""}">${m != null ? fmt(m, un === "km" ? 1 : 0) : "—"} / ${unitLabel(alvo, un)}</b></div>
      <div class="bar" style="margin-top:4px"><i style="width:${pct}%"></i></div></li>`;
  }).join("")}</ul>`;
}

// Formulário da avaliação (usado aqui e no card da Missão, no Dia de Avaliação).
// data-rascunho: o que for digitado fica salvo na hora e volta se você trocar de aba ou fechar o app.
export function avaliacaoForm(ph) {
  const t = today();
  return `<form data-act="saveAvaliacao" data-rascunho="avaliacao">${ph.tests.map(([n, alvo, un], i) => {
    const k = testKey(n), m = S.pr?.[k], hoje = m?.d === t;
    return `<div class="field"><label for="av${i}">${esc(n)} <span class="muted">(meta do rank ${ph.rank}: ${unitLabel(alvo, un)})</span>
        ${hoje ? `<span class="ok" style="text-transform:none;letter-spacing:0"> ✔ salvo hoje: ${fmt(m.v, un === "km" ? 1 : 0)}</span>` : ""}</label>
      <div class="row"><input id="av${i}" name="${k}" inputmode="decimal" placeholder="${m ? `atual: ${m.v} (${fmtDate(m.d, { day: "2-digit", month: "2-digit" })})` : "seu máximo"}">
        <button type="button" class="btn sm ${hoje ? "ghost" : ""}" data-act="savePR" data-key="${k}" data-nome="${esc(n)}">${hoje ? "Corrigir" : "Salvar"}</button></div></div>`;
  }).join("")}
    <p class="small muted" style="margin-top:0">Salve cada prova assim que fizer. O que você digita também fica guardado como rascunho.</p>
    <button class="btn ghost block">Salvar todas as preenchidas</button></form>`;
}

export const provasHoje = ph => ph.tests.filter(([n]) => S.pr?.[testKey(n)]?.d === today()).length;

// Salva uma prova só
actions.savePR = ({ key, nome }, el) => {
  if (!liberada()) return toast(`A avaliação desta semana já foi feita. Próxima em ${fmtDate(proximaAvaliacao())}.`, 4000);
  const input = el.closest(".field").querySelector("input"), v = num(input.value);
  if (v == null || !(v > 0)) return toast("Digite o número antes de salvar.");
  setPR(key, v);
  marcaAvaliacao();
  if (S.rascunhos?.avaliacao?.v) delete S.rascunhos.avaliacao.v[key];
  save();
  refresh();
  toast(`${nome}: ${fmt(v, v % 1 ? 1 : 0)} salvo.`);
};

views.avaliacao = () => {
  const ph = currentPhase(), t = currentTrack();
  if (!ph) return `${header()}<div class="stack">${panel("Teste de Avaliação", `<p>Escolha uma trilha primeiro.</p><a class="btn block" href="#/treino">Ir para a Missão</a>`)}</div>`;
  const pode = liberada();
  const form = avaliacaoForm(ph);
  return `${header()}<div class="stack">
    ${panel("Teste de Avaliação", `<p style="margin-top:0">Meça o seu <b>máximo de hoje</b> em cada prova: uma série só, sem parar, com boa forma. Faça descansado, de preferência no começo de um treino.</p>
      <p class="small muted">Esses números viram o seu Status e <b>ajustam os treinos</b>: as séries pedem de ~70% a ~85% do seu máximo, e a série longa vai de ~90% até além dele. Pode deixar em branco o que não medir hoje.</p>
      <p class="small muted">Dica: na Missão, escolha <b>"Hoje é dia de Avaliação"</b> para a avaliação contar como a missão do dia. O ideal é reavaliar a cada 2 a 4 semanas${prEm() ? ` (a última foi há ${daysBetween(prEm(), today())} dia${daysBetween(prEm(), today()) === 1 ? "" : "s"})` : ""}.</p>
      ${pode ? form : `<p class="warn">Próxima avaliação em <b>${fmtDate(proximaAvaliacao())}</b>.</p>
        <p class="small muted" style="margin-bottom:0">Uma avaliação por semana. As tentativas de Teste de Rank também atualizam seus máximos.</p>`}`)}
    ${panel(`Status · rumo ao rank ${ph.rank}`, statusList(ph) + `<p class="small muted" style="margin-bottom:0">${t.nome} · fase ${esc(ph.nome)}</p>`)}</div>`;
};

actions.saveAvaliacao = d => {
  if (!liberada()) return toast("A avaliação desta semana já foi feita.");
  const ph = currentPhase();
  const vals = Object.entries(d).map(([k, v]) => [k, num(v)]).filter(([, v]) => v != null && v > 0);
  if (!vals.length) return toast("Preencha pelo menos uma prova.");
  const keys = new Set(ph.tests.map(([n]) => testKey(n)));
  for (const [k, v] of vals) if (keys.has(k)) setPR(k, v);
  marcaAvaliacao();
  if (S.rascunhos) delete S.rascunhos.avaliacao;
  save();
  const missao = S.days[today()]?.workout?.plano?.modo === "avaliacao" && !S.days[today()].workout.done;
  go(missao ? "treino" : "avaliacao");
  sysMessage("Status atualizado", `<p>${vals.length} prova${vals.length > 1 ? "s" : ""} registrada${vals.length > 1 ? "s" : ""}.</p>
    <p class="small muted">Os treinos já estão ajustados aos seus máximos. Próxima avaliação em ${fmtDate(proximaAvaliacao())}.</p>
    ${missao ? `<p class="glow">Agora bata o ponto de saída para concluir a missão de hoje.</p>` : ""}`);
};
