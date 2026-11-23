// Integração com o app Android (quando o app roda dentro da casca nativa).
// No navegador comum, `nativo` é null e nada disto faz efeito.
import { S } from "./store.js";
import { today } from "./util.js";
import { inPenalty } from "./game.js";
import { todasConcluidas } from "./tracks.js";

export const nativo = window.SistemaNative || null;

// Lista fixa de apps bloqueados (o app 1.2+ já ignora a lista enviada; o 1.1 usa esta, para bloquear todos também)
export const APPS_TODOS = ["com.whatsapp", "com.whatsapp.w4b", "com.google.android.gm", "com.instagram.android", "com.zhiliaoapp.musically",
  "com.ss.android.ugc.trill", "com.google.android.youtube", "com.facebook.katana", "com.facebook.lite", "com.netflix.mediaclient",
  "com.crunchyroll.crunchyroid", "com.amazon.avod.thirdpartyclient", "com.spotify.music", "com.android.chrome"];
export let ultimoSync = null; // diagnóstico: o que foi enviado ao Android por último

export function nativeStatus() {
  if (!nativo) return null;
  try { return JSON.parse(nativo.status()); } catch { return null; }
}

// Último dia com missão concluída (qualquer trilha)
function lastDone() {
  return Object.keys(S.days).filter(d => S.days[d].workout?.done).sort().pop() || "";
}

// Informa ao Android o estado do jogo. Chamado a cada atualização da tela (é barato).
let ultimo = "";
export function syncNative() {
  if (!nativo || !S.profile) return;
  const cfg = S.nativeCfg || {};
  const payload = {
    penalty: inPenalty(),
    restDay: S.profile.restDay ?? 0,
    obligatedFrom: todasConcluidas() ? "" : (S.trackSince || S.track?.startDate || ""),
    lastDone: lastDone(),
    today: today(),
    blocked: APPS_TODOS,
    gold: Math.round(S.game.gold), xp: Math.round(S.game.xp), // o toque de recolher só libera se der para pagar
    ...(cfg.lembreteHora != null ? { reminderHour: cfg.lembreteHora } : {}),
  };
  const j = JSON.stringify(payload);
  if (j === ultimo) return;
  ultimo = j;
  try { nativo.sync(j); ultimoSync = { em: new Date().toLocaleTimeString("pt-BR"), penalty: payload.penalty, ok: true }; }
  catch (e) { ultimoSync = { em: new Date().toLocaleTimeString("pt-BR"), penalty: payload.penalty, ok: false, erro: String(e?.message || e) }; }
}

// Rastreamento de atividade pelo Android (app 1.5+): continua medindo com a tela bloqueada
export const gpsNativo = () => typeof nativo?.trackStart === "function";
export function nativeTrack(cmd, ...args) {
  try { const r = nativo[cmd](...args); return typeof r === "string" && r.startsWith("{") ? JSON.parse(r) : r; } catch { return null; }
}

// Versão publicada do app Android (download/versao.json sem cache) × a instalada
export let atualizacao = null; // { instalada, nova, url } quando há versão nova
const numVer = v => String(v || "0").split(".").map(n => parseInt(n, 10) || 0);
const maior = (a, b) => { const x = numVer(a), y = numVer(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
export async function conferirAtualizacao() {
  const st = nativeStatus(); if (!st?.version) return null;
  try {
    const r = await fetch(`download/versao.json?t=${Date.now()}`, { cache: "no-store" }); if (!r.ok) return null;
    const v = await r.json();
    // endereço único por versão: o Chrome e o servidor não têm como entregar o arquivo antigo guardado
    atualizacao = maior(v.versionName, st.version) ? { instalada: st.version, nova: v.versionName, url: `download/o-sistema.apk?v=${v.versionCode}-${(v.sha256 || "").slice(0, 8)}` } : null;
  } catch { /* sem internet: tenta na próxima */ }
  return atualizacao;
}

// Toque de recolher (app Android 1.8+)
export const temToque = () => typeof nativo?.toqueCobrancas === "function";
export function toqueStatus() { const st = nativeStatus(); return st?.toque || null; }
export function toqueCobrancas() { try { return JSON.parse(nativo.toqueCobrancas()); } catch { return []; } }

export function keepScreenOn(on) { try { nativo?.keepScreenOn(!!on); } catch { /* sem suporte */ } }

// Copiar texto: no WebView o clipboard da web às vezes falha; aí usa o do Android
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { if (nativo) { nativo.copy(text); return true; } return false; }
}

// Salvar arquivo: no WebView o download por link não funciona; o Android grava em Downloads
export function saveFile(name, text) {
  if (nativo) return nativo.saveFile(name, text);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
