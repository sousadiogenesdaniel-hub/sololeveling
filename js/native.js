// Integração com o app Android (quando o app roda dentro da casca nativa).
// No navegador comum, `nativo` é null e nada disto faz efeito.
import { S } from "./store.js";
import { today } from "./util.js";
import { inPenalty } from "./game.js";
import { trackFinished } from "./tracks.js";

export const nativo = window.SistemaNative || null;

// TESTE DO BLOQUEIO pedido pelo jogador em 20/11/2026: liga a Zona de Penalidade SÓ no Android até o horário
// abaixo, para conferir que o WhatsApp é bloqueado. Não mexe no jogo (sem falta, multa, XP ou Ouro).
// Expira sozinho; depois do horário, abrir o app desliga o bloqueio. Remover depois do teste.
export const TESTE_BLOQUEIO_ATE = Date.parse("2026-11-20T21:00:00Z"); // 18:00 em Brasília
export const testeBloqueio = () => !!nativo && Date.now() < TESTE_BLOQUEIO_ATE;

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
    penalty: inPenalty() || testeBloqueio(),
    restDay: S.profile.restDay ?? 0,
    obligatedFrom: trackFinished() ? "" : (S.trackSince || S.track?.startDate || ""),
    lastDone: lastDone(),
    today: today(),
    ...(cfg.blocked ? { blocked: cfg.blocked } : {}),
    ...(cfg.lembreteHora != null ? { reminderHour: cfg.lembreteHora } : {}),
  };
  const j = JSON.stringify(payload);
  if (j === ultimo) return;
  ultimo = j;
  try { nativo.sync(j); } catch { /* casca antiga */ }
}

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
