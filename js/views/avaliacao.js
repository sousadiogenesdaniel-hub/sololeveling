// Teste de Avaliação: o jogador mede o próprio máximo em cada prova do Teste de Rank da fase.
// Esses números viram o "Status" (progresso até a meta do rank) e calibram os treinos.
import { views, actions, go } from "../core.js";
import { S, save } from "../store.js";
import { today, addDays, daysBetween, fmt, fmtDate, num, esc } from "../util.js";
import { header, panel, sysMessage, toast } from "../ui.js";
import { currentPhase, currentTrack, testKey, pr, setPR, unitLabel } from "../tracks.js";

export const AVALIACAO_DIAS = 7;
export const proximaAvaliacao = () => S.prEm ? addDays(S.prEm, AVALIACAO_DIAS) : null;
const liberada = () => !S.prEm || daysBetween(S.prEm, today()) >= AVALIACAO_DIAS;

// Lista "Status": cada prova da fase com o seu máximo e a barra até a meta
export function statusList(ph) {
  return `<ul class="list small">${ph.tests.map(([n, alvo, un]) => {
    const m = pr(testKey(n)), pct = m ? Math.min(100, m / alvo * 100) : 0;
    return `<li style="display:block"><div class="row between"><span>${esc(n)}</span>
      <b class="num ${m >= alvo ? "ok" : ""}">${m != null ? fmt(m, un === "km" ? 1 : 0) : "—"} / ${unitLabel(alvo, un)}</b></div>
      <div class="bar" style="margin-top:4px"><i style="width:${pct}%"></i></div></li>`;
  }).join("")}</ul>`;
}

views.avaliacao = () => {
  const ph = currentPhase(), t = currentTrack();
  if (!ph) return `${header()}<div class="stack">${panel("Teste de Avaliação", `<p>Escolha uma trilha primeiro.</p><a class="btn block" href="#/treino">Ir para a Missão</a>`)}</div>`;
  const pode = liberada();
  const form = `<form data-act="saveAvaliacao">${ph.tests.map(([n, alvo, un], i) => {
    const k = testKey(n), m = S.pr?.[k];
    return `<div class="field"><label for="av${i}">${esc(n)} <span class="muted">(meta do rank ${ph.rank}: ${unitLabel(alvo, un)})</span></label>
      <input id="av${i}" name="${k}" inputmode="decimal" placeholder="${m ? `atual: ${m.v} (${fmtDate(m.d, { day: "2-digit", month: "2-digit" })})` : "seu máximo"}"></div>`;
  }).join("")}
    <button class="btn primary block">Salvar meus máximos</button></form>`;
  return `${header()}<div class="stack">
    ${panel("Teste de Avaliação", `<p style="margin-top:0">Meça o seu <b>máximo de hoje</b> em cada prova: uma série só, sem parar, com boa forma. Faça descansado, de preferência no começo de um treino.</p>
      <p class="small muted">Esses números viram o seu Status e <b>ajustam os treinos</b>: as séries pedem de ~70% a ~85% do seu máximo, e a série longa vai de ~90% até além dele. Pode deixar em branco o que não medir hoje.</p>
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
  S.prEm = today();
  save();
  go("avaliacao");
  sysMessage("Status atualizado", `<p>${vals.length} prova${vals.length > 1 ? "s" : ""} registrada${vals.length > 1 ? "s" : ""}.</p>
    <p class="small muted">Os treinos já estão ajustados aos seus máximos. Próxima avaliação em ${fmtDate(proximaAvaliacao())}.</p>`);
};
