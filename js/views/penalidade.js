// Zona de Penalidade: cada falta é paga por PIX a cada pessoa do grupo, e o app lê os comprovantes
import { views, actions, refresh } from "../core.js";
import { S, save } from "../store.js";
import { esc, fmt, fmtDate, today, uid, $ } from "../util.js";
import { header, panel, toast, sysMessage, modal, closeModal, confirmBox } from "../ui.js";
import { pendingDebts, monthDebt, inPenalty, grupo, debtState, debtMembers, addPayment, R } from "../game.js";
import { readText, parsePix, checkPix } from "../ocr.js";

const brl = v => "R$ " + fmt(v, 2);

function debtCard(d) {
  const st = debtState(d);
  if (!st.membros.length) {
    return panel(`Falta de ${fmtDate(d.date)}`, `<p>Cadastre as pessoas do grupo (abaixo) para saber para quem pagar.</p>`, "alert", `<span class="chip bad">Pendente</span>`);
  }
  const membros = st.membros.map(m => {
    const g = grupo().find(x => x.id === m.id);
    return `<li><span class="grow"><b>${esc(m.nome)}</b><br>
      <span class="small ${m.falta ? "bad" : "ok"}">${m.falta ? `falta ${brl(m.falta)}` : `✔ pago ${brl(m.pago)}`}</span></span>
      ${m.falta && g?.chave ? `<button class="btn sm" data-act="copyKey" data-id="${m.id}">Copiar chave</button>` : ""}</li>`;
  }).join("");
  const lidos = (d.pagamentos || []).map(p => `<li><span class="grow">${brl(p.valor)} para ${esc(debtMembers(d).find(m => m.id === p.membro)?.nome || "?")}</span>
    <span class="small muted">${fmtDate(p.data)}${p.hora ? " " + p.hora : ""}</span></li>`).join("");
  return panel(`Falta de ${fmtDate(d.date)}`, `
    <div class="row between"><span class="mid num bad" style="white-space:nowrap">${brl(st.total - st.pago > 0 ? st.total - st.pago : 0)}</span>
      <span class="small muted">${brl(st.valor)} para cada uma das ${st.membros.length} pessoas</span></div>
    <ul class="list">${membros}</ul>
    <p class="small muted">Faça um PIX de ${brl(st.valor)} para cada pessoa e envie aqui o print de cada comprovante. O Sistema lê o valor, a data, a hora e quem recebeu.</p>
    <label class="btn primary block">Enviar comprovante PIX
      <input type="file" accept="image/*" class="hidden" data-chg="pixProof" data-serial="${d.serial}"></label>
    <p class="small muted" id="st-${d.serial}" role="status"></p>
    ${lidos ? `<h3 style="margin-top:6px">Comprovantes aceitos</h3><ul class="list small">${lidos}</ul>` : ""}`, "alert", `<span class="chip bad">Pendente</span>`);
}

views.penalidade = () => {
  const pend = pendingDebts(), md = monthDebt(), p = S.profile;
  const feitas = S.debts.filter(d => d.status === "validado").reverse().slice(0, 12);
  const status = !inPenalty()
    ? panel("Situação", `<p class="mid ok">Sem penalidades ativas</p><p class="muted small">Continue cumprindo as missões diárias.</p>`, "good")
    : panel("Zona de Penalidade", `<p>Para o Sistema voltar ao normal:</p><ul>
        ${pend.length ? `<li>Pagar a multa por PIX a cada pessoa do grupo e enviar os comprovantes (${pend.length} falta${pend.length > 1 ? "s" : ""})</li>` : `<li class="ok">Multas pagas ✔</li>`}
        ${S.game.needsWorkout ? `<li>Concluir um treino (<a href="#/treino">ir para a missão</a>)</li>` : `<li class="ok">Treino de redenção cumprido ✔</li>`}</ul>
        <p class="small muted">Cada dia com multa pendente custa ${-R.corrosaoXp} XP.</p>`, "alert");
  const g = grupo();
  const grupoPanel = panel("Pessoas do grupo", `
    ${g.length ? `<ul class="list">${g.map(m => `<li><span class="grow"><b>${esc(m.nome)}</b><br>
      <span class="small muted">${m.chave ? "chave PIX: " + esc(m.chave) : "sem chave PIX cadastrada"}</span></span>
      <button class="btn sm ghost" data-act="editMember" data-id="${m.id}" aria-label="Editar ${esc(m.nome)}">✎</button></li>`).join("")}</ul>`
      : `<p class="warn small">Ninguém cadastrado ainda.</p>`}
    <p class="small muted">Cadastre o nome completo como aparece no comprovante do PIX (o Sistema usa o nome para saber quem recebeu). A chave PIX é opcional e só serve para o botão de copiar.</p>
    <button class="btn block" data-act="editMember" data-id="">+ Adicionar pessoa</button>`, "", `<span class="small muted">${g.length}</span>`);
  return `${header()}<div class="stack">${status}
    ${pend.map(debtCard).join("")}
    ${panel("Multas do mês", `<div class="grid3">
      <div class="tile"><div class="lbl">Faltas</div><div class="val num">${md.faltas}</div></div>
      <div class="tile"><div class="lbl">Total</div><div class="val num ${md.total ? "bad" : ""}">${brl(md.total)}</div></div>
      <div class="tile"><div class="lbl">Pago</div><div class="val num ok">${brl(md.pago)}</div></div></div>
      <p class="small muted">${brl(p.multa ?? 10)} por falta para cada pessoa do grupo, pago na hora por PIX. O valor da multa fica no Perfil.</p>`)}
    ${grupoPanel}
    ${feitas.length ? panel("Multas pagas", `<ul class="list small">${feitas.map(d => `<li><span class="grow">${fmtDate(d.date)}</span>
      <span class="num">${brl(debtState(d).pago)}</span><span class="ok">✔</span></li>`).join("")}</ul>`) : ""}</div>`;
};

// ---- pessoas do grupo --------------------------------------------------------------
actions.editMember = ({ id }) => {
  const m = grupo().find(x => x.id === id);
  const o = modal(`<div class="ptitle"><h2>${m ? "Editar pessoa" : "Nova pessoa"}</h2></div>
    <form id="mf"><div class="field"><label for="mn">Nome completo (como aparece no PIX)</label><input id="mn" name="nome" required maxlength="60" value="${esc(m?.nome || "")}"></div>
      <div class="field"><label for="mk">Chave PIX (opcional)</label><input id="mk" name="chave" maxlength="80" value="${esc(m?.chave || "")}" autocomplete="off"></div>
      <div class="row">${m ? `<button type="button" class="btn danger" id="mdel">Remover</button>` : ""}<button class="btn primary grow">Salvar</button></div></form>`);
  $("#mf", o).onsubmit = e => {
    e.preventDefault();
    const nome = e.target.nome.value.trim().replace(/\s+/g, " "), chave = e.target.chave.value.trim();
    if (nome.split(" ").length < 2) return toast("Coloque nome e sobrenome, como aparece no comprovante.");
    if (m) Object.assign(m, { nome, chave }); else grupo().push({ id: uid(), nome, chave });
    save(); closeModal(); refresh();
  };
  if (m) $("#mdel", o).onclick = async () => {
    if (!await confirmBox("Remover pessoa", `Remover ${m.nome}? Faltas já registradas continuam com quem estava no grupo na época.`, "Remover")) return;
    S.grupo = grupo().filter(x => x.id !== id); save(); refresh();
  };
};

actions.copyKey = async ({ id }) => {
  const m = grupo().find(x => x.id === id);
  try { await navigator.clipboard.writeText(m.chave); toast(`Chave PIX de ${m.nome.split(" ")[0]} copiada.`); }
  catch { toast("Não consegui copiar. Selecione a chave e copie manualmente."); }
};

// ---- comprovante -------------------------------------------------------------------
actions.pixProof = async ({ serial }, el) => {
  const file = el.files[0]; el.value = "";
  if (!file) return;
  const d = S.debts.find(x => x.serial === serial), st = document.getElementById("st-" + serial);
  st.textContent = "Lendo o comprovante… (pode levar alguns segundos)";
  let text;
  let passo = 0;
  try { text = await readText(file, p => { if (p === 1) passo++; st.textContent = `Lendo o comprovante… ${Math.min(99, Math.round((passo + p) / 3 * 100))}%`; }, "pix"); }
  catch (e) { st.textContent = ""; return toast(e.message || "Falha ao ler a imagem.", 5000); }
  st.textContent = "";
  const r = parsePix(text, debtMembers(d));
  const c = checkPix(r, d, { today: today(), usados: S.pixIds || [] });
  const lido = `<ul class="small" style="text-align:left;margin:0;padding-left:18px">
    <li>Valor: <b>${r.valor ? brl(r.valor) : "—"}</b></li><li>Data: <b>${r.data ? fmtDate(r.data) : "—"}${r.hora ? " " + r.hora : ""}</b></li>
    <li>Recebedor: <b>${r.membro ? esc(r.membro.nome) : "não reconhecido"}</b></li>${r.id ? `<li>ID: <b class="num">${esc(r.id.slice(0, 12))}…</b></li>` : ""}</ul>`;
  if (!c.ok) {
    return sysMessage("Comprovante recusado", `<p>${c.prob.map(esc).join("; ")}.</p>${lido}
      <p class="small muted">Envie o print do comprovante inteiro, sem cortar o valor, a data, a hora e o nome de quem recebeu.</p>
      <details class="small muted" style="text-align:left"><summary>Texto que o Sistema leu</summary><pre class="msg">${esc(text[0].trim().slice(0, 900)) || "(nada)"}</pre></details>`);
  }
  const s = addPayment(d, { chave: c.chave, id: r.id, valor: r.valor, membro: r.membro.id, data: r.data, hora: r.hora, lidoEm: today() });
  refresh();
  const faltam = s.membros.filter(m => m.falta);
  sysMessage("Comprovante aceito", `<p class="mid ok">${brl(r.valor)} para ${esc(r.membro.nome.split(" ")[0])}</p>${lido}
    <p>${faltam.length ? `Ainda falta: ${faltam.map(m => `${esc(m.nome.split(" ")[0])} (${brl(m.falta)})`).join(", ")}.`
      : `Multa de ${fmtDate(d.date)} quitada.`}</p>
    <p class="small muted">${!faltam.length && !inPenalty() ? "Você saiu da Zona de Penalidade. Não repita." : inPenalty() && !faltam.length ? "Ainda há pendências para sair da Zona de Penalidade." : ""}</p>`);
};
