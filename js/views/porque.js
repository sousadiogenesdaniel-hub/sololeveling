// Meu porquê: as fotos e as mensagens do ritual do dia. Tudo fica só neste aparelho (nada vai para o código).
import { views, actions, refresh } from "../core.js";
import { S, save, photos } from "../store.js";
import { today, esc, fmt, num, fmtDate, shrinkImage, uid, $ } from "../util.js";
import { header, panel, toast, confirmBox, modal, closeModal } from "../ui.js";
import { ritual, CONTEXTOS, CURTA, fotosRitual, mostrarRitual } from "../ritual.js";
import { syncNative } from "../native.js";

let urls = [];
const contar = ctx => ritual().msgs.filter(m => m.ctx === ctx).length;
const vaiParaBloqueio = m => (m.ctx === "noite" || m.ctx === "penalidade") && m.txt.length <= CURTA;

function mensagensPanel() {
  const r = ritual();
  return panel("Mensagens", `<p class="small muted" style="margin-top:0">O ritual usa uma mensagem do contexto do dia; sem nenhuma, sorteia uma Geral. Não repete as últimas 3.
      As de <b>Noite</b> e da <b>Zona de Penalidade</b> com até ${CURTA} caracteres também aparecem nas telas de bloqueio do Android (app 2.0).</p>
    ${Object.entries(CONTEXTOS).map(([k, c]) => {
      const lista = r.msgs.filter(m => m.ctx === k);
      return `<h3 style="margin:14px 0 2px">${c.nome} <span class="small muted">(${lista.length})</span></h3><p class="small muted" style="margin:0 0 6px">${c.desc}</p>
        ${lista.length ? `<ul class="list small">${lista.map(m => `<li><span class="grow" style="text-align:left">${esc(m.txt)}
          ${vaiParaBloqueio(m) ? `<br><span class="chip">tela de bloqueio</span>` : ""}</span>
          <button class="btn sm ghost" data-act="editarMsg" data-id="${m.id}" aria-label="Editar">✎</button>
          <button class="btn sm danger" data-act="apagarMsg" data-id="${m.id}" aria-label="Apagar">✕</button></li>`).join("")}</ul>` : `<p class="small muted" style="margin:0">Nenhuma ainda.</p>`}`;
    }).join("")}`);
}

function novaPanel() {
  const opts = Object.entries(CONTEXTOS).map(([k, c]) => `<option value="${k}">${c.nome}</option>`).join("");
  return panel("Escrever mensagens", `<form data-act="addMsgs">
      <div class="field"><label for="pq-ctx">Contexto</label><select id="pq-ctx" name="ctx">${opts}</select></div>
      <div class="field"><label for="pq-txt">Mensagens (uma por linha)</label><textarea id="pq-txt" name="txt" rows="5" placeholder="Escreva uma mensagem por linha. Pode colar várias de uma vez."></textarea></div>
      <button class="btn primary block">Adicionar</button></form>`);
}

function fotosPanel() {
  return panel("Fotos do ritual", `<p class="small muted" style="margin-top:0">Todas de frente. <b>Antes</b> e <b>Meta</b> você escolhe aqui; <b>Agora</b> é sempre a foto de frente mais recente de <a href="#/fotos">Fotos</a>.</p>
    <div class="rt-fotos" id="pq-fotos"><p class="muted small">Carregando…</p></div>
    <form data-act="fotoRitual" style="margin-top:10px">
      <div class="row"><div class="field grow"><label for="pq-qual">Foto</label><select id="pq-qual" name="qual"><option value="antes">Antes</option><option value="meta">Meta</option></select></div>
        <div class="field grow"><label for="pq-data">Data (Antes)</label><input id="pq-data" type="date" name="data" max="${today()}"></div>
        <div class="field grow"><label for="pq-peso">Peso (Antes)</label><input id="pq-peso" name="peso" inputmode="decimal" placeholder="kg"></div></div>
      <div class="field"><label for="pq-arq">Imagem</label><input id="pq-arq" type="file" name="foto" accept="image/*" required></div>
      <button class="btn block">Salvar a foto</button></form>
    <p class="small muted" style="margin-bottom:0">A Meta: uma versão realista sua no peso-meta (por exemplo, feita com uma IA de imagem). Se um dia ela pesar em vez de puxar, apague.</p>`);
}

views.porque = () => `${header()}<div class="stack">
  ${panel("Meu porquê", `<p style="margin-top:0">Na primeira abertura de cada dia, antes de qualquer aviso, o Sistema mostra as suas fotos e uma das suas mensagens. O botão <b>Eu lembro</b> só ativa depois de 5 segundos, e você precisa segurá-lo.</p>
    <p class="small muted">Tudo aqui fica só neste aparelho. As fotos não entram no backup.</p>
    <button class="btn primary block" data-act="previaRitual">Ver o ritual agora</button>`)}
  ${fotosPanel()}${novaPanel()}${mensagensPanel()}</div>`;

views.porque.after = async () => {
  urls.forEach(URL.revokeObjectURL); urls = [];
  const el = $("#pq-fotos"); if (!el) return;
  const f = await fotosRitual();
  const fig = (rot, foto, qual) => {
    let im = `<div class="rt-vazio">sem foto</div>`;
    if (foto?.blob) { const u = URL.createObjectURL(foto.blob); urls.push(u); im = `<img src="${u}" alt="${rot}">`; }
    return `<figure>${im}<figcaption><b>${rot}</b>${foto?.date ? ` · ${fmtDate(foto.date)}` : ""}${foto?.peso ? ` · ${fmt(foto.peso, 1)} kg` : ""}
      ${qual && foto ? `<br><button class="btn sm danger" data-act="apagarFotoRitual" data-id="${foto.id}">Apagar</button>` : ""}</figcaption></figure>`;
  };
  el.innerHTML = fig("Antes", f.antes, "antes") + fig("Agora", f.agora, null) + fig("Meta", f.meta, "meta");
};

actions.previaRitual = () => mostrarRitual({ previa: true });

actions.addMsgs = (d, form) => {
  const linhas = String(d.txt || "").split("\n").map(l => l.replace(/^\s*(\d+[.)]|[-•])\s*/, "").trim()).filter(Boolean);
  if (!linhas.length) return toast("Escreva pelo menos uma mensagem.");
  const r = ritual();
  for (const txt of linhas) r.msgs.push({ id: uid(), ctx: d.ctx, txt: txt.slice(0, 400) });
  save(); syncNative(); form.reset(); refresh();
  toast(`${linhas.length} mensage${linhas.length > 1 ? "ns adicionadas" : "m adicionada"}.`);
};
actions.apagarMsg = async ({ id }) => {
  if (!await confirmBox("Apagar mensagem", "Ela sai do ritual e das telas de bloqueio.", "Apagar")) return;
  const r = ritual(); r.msgs = r.msgs.filter(m => m.id !== id); save(); syncNative(); refresh();
};
actions.editarMsg = ({ id }) => {
  const m = ritual().msgs.find(x => x.id === id); if (!m) return;
  const o = modal(`<div class="ptitle"><h2>Editar mensagem</h2></div>
    <form data-act="salvarMsg" data-id="${id}">
      <div class="field"><label for="pq-ectx">Contexto</label><select id="pq-ectx" name="ctx">${Object.entries(CONTEXTOS).map(([k, c]) => `<option value="${k}" ${k === m.ctx ? "selected" : ""}>${c.nome}</option>`).join("")}</select></div>
      <div class="field"><label for="pq-etxt">Mensagem</label><textarea id="pq-etxt" name="txt" rows="4">${esc(m.txt)}</textarea></div>
      <div class="row"><button type="button" class="btn ghost grow" data-close>Cancelar</button><button class="btn primary grow">Salvar</button></div></form>`);
  $("#pq-etxt", o)?.focus();
};
actions.salvarMsg = (d, form) => {
  const m = ritual().msgs.find(x => x.id === form.dataset.id); if (!m) return;
  const txt = String(d.txt || "").trim(); if (!txt) return toast("A mensagem está vazia.");
  m.txt = txt.slice(0, 400); m.ctx = d.ctx;
  save(); syncNative(); closeModal(); refresh();
};
actions.fotoRitual = async (d, form) => {
  const file = form.foto.files[0]; if (!file) return;
  const tipo = d.qual === "meta" ? "ritual-meta" : "ritual-antes";
  const peso = num(d.peso);
  let blob;
  try { blob = await shrinkImage(file, 1200); } catch { return toast("Não consegui ler essa imagem."); }
  for (const p of (await photos.all()).filter(p => p.tipo === tipo)) await photos.del(p.id); // uma de cada
  await photos.add({ tipo, angulo: "frente", date: d.qual === "antes" ? (d.data || today()) : today(), ...(d.qual === "antes" && peso ? { peso } : {}), blob });
  ritual().temFoto = true; save();
  toast("Foto salva."); refresh();
};
actions.apagarFotoRitual = async ({ id }) => {
  if (!await confirmBox("Apagar foto", "Ela sai do ritual e do aparelho.", "Apagar")) return;
  await photos.del(id); refresh();
};
