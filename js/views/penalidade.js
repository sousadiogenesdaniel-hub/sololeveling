// Zona de Penalidade: mensagem de WhatsApp com código do dia e validação do print
import { views, actions, refresh } from "../core.js";
import { S, save } from "../store.js";
import { esc, fmt, fmtDate, today } from "../util.js";
import { header, panel, toast, sysMessage } from "../ui.js";
import { pendingDebts, debtMessage, monthDebt, inPenalty, R } from "../game.js";
import { readText, checkProof } from "../ocr.js";

views.penalidade = () => {
  const pend = pendingDebts(), md = monthDebt(), p = S.profile;
  const feitas = S.debts.filter(d => d.status === "validado").reverse().slice(0, 12);
  const status = !inPenalty()
    ? panel("Situação", `<p class="mid ok">Sem penalidades ativas</p><p class="muted small">Continue cumprindo as missões diárias.</p>`, "good")
    : panel("Zona de Penalidade", `<p>Para o Sistema voltar ao normal:</p><ul>
        ${pend.length ? `<li>Enviar e comprovar <b>${pend.length}</b> mensagem${pend.length > 1 ? "s" : ""} no grupo do WhatsApp</li>` : `<li class="ok">Comprovantes em dia ✔</li>`}
        ${S.game.needsWorkout ? `<li>Concluir um treino (<a href="#/treino">ir para a missão</a>)</li>` : `<li class="ok">Treino de redenção cumprido ✔</li>`}</ul>
        <p class="small muted">Cada dia com comprovante pendente custa ${-R.corrosaoXp} XP.</p>`, "alert");
  return `${header()}<div class="stack">${status}
    ${pend.map(d => panel(`Falta de ${fmtDate(d.date)}`, `
      <p class="small muted" style="margin-top:0">1. Envie a mensagem abaixo no grupo. 2. Tire um print da conversa mostrando a mensagem enviada. 3. Envie o print aqui.</p>
      <pre class="msg" id="msg-${d.serial}">${esc(debtMessage(d))}</pre>
      <div class="row" style="margin-top:10px">
        <button class="btn sm grow" data-act="copyMsg" data-serial="${d.serial}">Copiar</button>
        <a class="btn sm grow" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(debtMessage(d))}">Abrir WhatsApp</a></div>
      <label class="btn primary block" style="margin-top:8px">Enviar print para validar
        <input type="file" accept="image/*" class="hidden" data-chg="proof" data-serial="${d.serial}"></label>
      <p class="small muted" id="st-${d.serial}" role="status"></p>`, "alert", `<span class="chip bad">Pendente</span>`)).join("")}
    ${panel("Dívida do mês", `<div class="grid2">
      <div class="tile"><div class="lbl">Faltas no mês</div><div class="val num">${md.faltas}</div></div>
      <div class="tile"><div class="lbl">Total a pagar</div><div class="val num ${md.total ? "bad" : ""}">R$ ${fmt(md.total)},00</div></div></div>
      <p class="small muted">R$ ${fmt(p.multa ?? 10)},00 por falta para cada uma das ${p.pessoas ?? 1} pessoas do grupo, pago no fim do mês. Ajuste no Perfil.</p>`)}
    ${feitas.length ? panel("Comprovadas", `<ul class="list small">${feitas.map(d => `<li><span class="grow">${fmtDate(d.date)}</span><span class="muted">${d.serial}</span><span class="ok">✔</span></li>`).join("")}</ul>`) : ""}</div>`;
};

actions.copyMsg = async ({ serial }) => {
  const d = S.debts.find(x => x.serial === serial);
  try { await navigator.clipboard.writeText(debtMessage(d)); toast("Mensagem copiada."); }
  catch { toast("Não consegui copiar. Selecione o texto e copie manualmente."); }
};

actions.proof = async ({ serial }, el) => {
  const file = el.files[0]; el.value = "";
  if (!file) return;
  const d = S.debts.find(x => x.serial === serial), st = document.getElementById("st-" + serial);
  st.textContent = "Lendo o print… (pode levar alguns segundos)";
  let text;
  try { text = await readText(file, p => { st.textContent = `Lendo o print… ${Math.round(p * 100)}%`; }); }
  catch (e) { st.textContent = ""; return toast(e.message || "Falha ao ler a imagem.", 5000); }
  const r = checkProof(text, d);
  if (!r.ok) {
    st.textContent = "";
    const faltou = [!r.codigo && `o código ${d.serial}`, !r.texto && "o texto da penalidade", !r.hora && "o horário da mensagem enviada"].filter(Boolean);
    return sysMessage("Print recusado", `<p>Não encontrei no print: <b>${faltou.join(", ")}</b>.</p>
      <p class="small muted">Envie a mensagem exatamente como gerada e tire o print com ela inteira visível, sem cortar o código nem o horário.</p>
      <details class="small muted" style="text-align:left"><summary>O que o Sistema leu</summary><pre class="msg">${esc(text.trim().slice(0, 600)) || "(nada)"}</pre></details>`);
  }
  d.status = "validado"; d.validatedAt = today();
  save(); refresh();
  sysMessage("Comprovante aceito", `<p class="mid ok">Dívida de ${fmtDate(d.date)} registrada</p>
    <p class="small muted">${inPenalty() ? "Ainda há pendências para sair da Zona de Penalidade." : "Você saiu da Zona de Penalidade. Não repita."}</p>`);
};
