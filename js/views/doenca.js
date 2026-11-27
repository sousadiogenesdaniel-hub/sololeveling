// Dia de doença: comprovar que está doente de verdade para a falta não levar à Zona de Penalidade. Comprovante:
// foto do atestado ou da dispensa médica, ou um vídeo curto de um Auditor do Sistema (quem receberia a multa) dizendo
// o nome, a data e o código do dia. O código muda a cada dia: um vídeo antigo ou gravado antes não serve. O app não
// reconhece rostos: a garantia é o próprio Auditor, que abre mão da multa ao gravar. O comprovante fica guardado.
import { actions, refresh } from "../core.js";
import { S, save, photos } from "../store.js";
import { today, addDays, esc, fmtDate, shrinkImage, $ } from "../util.js";
import { modal, closeModal, sysMessage, toast } from "../ui.js";
import { R, grupo, doenteEm, codigoDoenca, registrarDoenca } from "../game.js";

const VIDEO_MAX_S = 60, VIDEO_MAX_MB = 60;
const nomeCurto = () => (S.profile?.nome || "o jogador").split(" ")[0];
const duracao = file => new Promise(res => {
  const v = document.createElement("video"), u = URL.createObjectURL(file);
  const fim = d => { URL.revokeObjectURL(u); res(d); };
  v.preload = "metadata"; v.onloadedmetadata = () => fim(v.duration); v.onerror = () => fim(null); v.src = u;
  setTimeout(() => fim(null), 5000);
});

// Botão do card da Missão (hoje) e do card da multa (ontem)
export function botaoDoente(d = today()) {
  const r = doenteEm(d);
  if (r) return `<p class="small ok" style="margin:8px 0 0">🤒 Dia de doença comprovado (${r.tipo === "atestado" ? "atestado médico" : `Auditor ${esc(r.auditor)}`}). Descanse: à meia-noite o dia conta como falta, mas sem Zona de Penalidade.</p>`;
  return `<button class="btn ghost sm block" style="margin-top:8px" data-act="doente" data-d="${d}">🤒 ${d === today() ? "Estou doente" : "Estava doente: comprovar"}</button>`;
}

actions.doente = ({ d = today() }) => {
  if (d < addDays(today(), -1) || d > today() || doenteEm(d)) return;
  const cod = codigoDoenca(d), hoje = d === today(), aud = grupo();
  save();
  const o = modal(`<div class="ptitle"><h2>🤒 ${hoje ? "Doente hoje" : `Doente em ${fmtDate(d)}`}</h2><button class="btn sm ghost" data-close aria-label="Fechar">✕</button></div>
    <p class="small"><b>Resfriado leve</b> (nariz, garganta, espirro, sem febre)? Faça a missão mais leve: toque 2× na série para marcar "abaixo do alvo". A missão vale normal.</p>
    <p class="small"><b>Febre ou dor no corpo?</b> Não treine. Com um comprovante, o dia conta como falta (${R.faltaXp} XP, ${R.faltaOuro} Ouro, a sequência zera), mas <b>sem Zona de Penalidade</b>: sem multa por PIX e sem treino de redenção.</p>
    <p class="center" style="margin:10px 0 4px">Código ${hoje ? "de hoje" : "deste comprovante"}</p>
    <p class="center mid num glow" style="margin:0;letter-spacing:.3em">${cod}</p>
    <h3 style="margin:14px 0 6px">Comprovante</h3>
    <label class="btn block">📄 Foto do atestado ou da dispensa médica
      <input type="file" accept="image/*" capture="environment" class="hidden" id="dc-foto"></label>
    <div class="field" style="margin-top:12px"><label for="dc-aud">Ou: vídeo curto de um Auditor do Sistema</label>
      ${aud.length ? `<select id="dc-aud">${aud.map(m => `<option value="${esc(m.id)}">${esc(m.nome)}</option>`).join("")}</select>`
        : `<p class="small warn" style="margin:4px 0">Nenhum Auditor cadastrado. Cadastre em <a href="#/penalidade" data-close>Penalidades</a>.</p>`}</div>
    ${aud.length ? `<p class="small muted" id="dc-fala">Peça para ele gravar (até ${VIDEO_MAX_S} s), falando para a câmera: <i>"Eu, ${esc(aud[0].nome)}, Auditor do Sistema, atesto que ${esc(nomeCurto())} está doente ${hoje ? "hoje" : "desde ontem"}, ${fmtDate(today())}. Código ${cod}."</i> e te mandar o vídeo.</p>
      <label class="btn block">🎥 Enviar o vídeo do Auditor<input type="file" accept="video/*" class="hidden" id="dc-video"></label>` : ""}
    <p class="small muted" style="margin-bottom:0">O comprovante fica guardado no app. Sem comprovante, a falta é a de sempre.</p>`);
  const sel = $("#dc-aud", o), fala = $("#dc-fala", o);
  if (sel && fala) sel.onchange = () => { const m = aud.find(x => x.id === sel.value); fala.querySelector("i").textContent = `"Eu, ${m.nome}, Auditor do Sistema, atesto que ${nomeCurto()} está doente ${hoje ? "hoje" : "desde ontem"}, ${fmtDate(today())}. Código ${cod}."`; };
  $("#dc-foto", o).onchange = async e => {
    const file = e.target.files[0]; e.target.value = ""; if (!file) return;
    try { await photos.add({ date: d, angulo: "doenca", tipo: "prova", blob: await shrinkImage(file, 1400), codigo: cod }); }
    catch { return toast("Não consegui ler essa foto."); }
    concluir(d, { tipo: "atestado", codigo: cod });
  };
  const vid = $("#dc-video", o);
  if (vid) vid.onchange = async e => {
    const file = e.target.files[0]; e.target.value = ""; if (!file) return;
    if (file.size > VIDEO_MAX_MB * 1024 * 1024) return toast(`Vídeo grande demais (máximo ${VIDEO_MAX_MB} MB). Peça um mais curto.`, 4000);
    const s = await duracao(file);
    if (s && s > VIDEO_MAX_S + 1) return toast(`O vídeo tem ${Math.round(s)} s. Tem que ser curto: até ${VIDEO_MAX_S} s.`, 4000);
    const m = aud.find(x => x.id === sel.value);
    try { await photos.add({ date: d, angulo: "doenca-auditor", tipo: "prova", blob: file, auditor: m.nome, codigo: cod }); }
    catch { return toast("Não consegui guardar esse vídeo."); }
    concluir(d, { tipo: "auditor", auditor: m.nome, codigo: cod });
  };
};

function concluir(d, prova) {
  const r = registrarDoenca(d, prova); save(); closeModal(); refresh();
  if (!r) return;
  sysMessage("Dia de doença comprovado", `<p>${prova.tipo === "atestado" ? "Atestado médico guardado." : `Vídeo do Auditor <b>${esc(prova.auditor)}</b> guardado (código ${prova.codigo}).`}</p>
    <p>${d === today() ? "Descanse de verdade: beba água, durma e, com febre, procure a enfermaria. À meia-noite o dia conta como falta" : "A falta de ontem continua"}
      (${R.faltaXp} XP, ${R.faltaOuro} Ouro, a sequência zera), mas <b>sem Zona de Penalidade</b>${r.multaSaiu ? ": a multa de ontem saiu" : ""}.</p>
    ${d === today() ? `<p class="small muted">Melhorou ainda hoje? A missão continua disponível: se cumprir, não há falta.</p>` : ""}`);
}
