// Card de conquista para compartilhar (WhatsApp etc.): uma imagem 1080×1350 desenhada num canvas.
import { actions } from "./core.js";
import { S } from "./store.js";
import { today, fmtDate, esc } from "./util.js";
import { levelInfo } from "./game.js";
import { RANK_COLORS } from "./fx.js";
import { RAR } from "./premios.js";
import { nativo } from "./native.js";
import { toast } from "./ui.js";
import { tituloAtual } from "./conquistas.js";

// Botão que gera e compartilha o card. dados vai no próprio botão (JSON).
export const botaoCompartilhar = (tipo, dados, rotulo = "Compartilhar no WhatsApp") =>
  `<button class="btn block" style="margin-top:10px" data-act="compartilhar" data-tipo="${tipo}" data-json="${esc(JSON.stringify(dados))}">📤 ${rotulo}</button>`;

function quebrar(ctx, txt, max) {
  const linhas = []; let l = "";
  for (const w of String(txt).split(" ")) { const t = l ? l + " " + w : w; if (ctx.measureText(t).width > max && l) { linhas.push(l); l = w; } else l = t; }
  if (l) linhas.push(l);
  return linhas;
}
const svgImg = svg => new Promise(res => {
  const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null);
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '));
});

// Conteúdo de cada tipo de card: { cor, topo, titulo, linhas, texto (legenda da mensagem), arte (svg opcional) }
function conteudo(tipo, d) {
  const li = levelInfo();
  switch (tipo) {
    case "rank": return { cor: RANK_COLORS[d.rank], topo: "REAVALIAÇÃO DE RANK", titulo: `RANK ${d.rank}`, linhas: [d.trilha ? `Trilha: ${d.trilha}` : "", `Nível ${li.level}`],
      texto: `Subi para o rank ${d.rank} no O Sistema.` };
    case "recorde": return { cor: "#ffd166", topo: "NOVO RECORDE", titulo: `${d.de} → ${d.para}`, linhas: [d.nome],
      texto: `Novo recorde: ${d.nome}, de ${d.de} para ${d.para}.` };
    case "titulo": return { cor: RAR[d.rar].cor, topo: "TÍTULO CONQUISTADO", titulo: d.nome, linhas: [RAR[d.rar].nome.toUpperCase()],
      texto: `Conquistei o título "${d.nome}" (${RAR[d.rar].nome}) no O Sistema.` };
    case "sombra": return { cor: d.cor || "#b58cff", topo: "SOMBRA EXTRAÍDA", titulo: d.nome, linhas: [d.grau], arte: d.arte,
      texto: `Levante-se. ${d.nome} agora faz parte do meu exército.` };
    case "item": return { cor: RAR[d.rar].cor, topo: "ITEM DO ARSENAL", titulo: d.nome, linhas: [`${d.tipo} · ${RAR[d.rar].nome}`.toUpperCase()], arte: d.arte, quadrada: true,
      texto: `${d.nome} (${RAR[d.rar].nome}) agora está no meu Arsenal.` };
    case "portao": return { cor: d.cor, topo: "PORTÃO VENCIDO", titulo: d.nome, linhas: [`Rank ${d.rank}`, d.tempo ? `${d.tempo} min` : ""],
      texto: `Venci o ${d.nome} (rank ${d.rank}) no O Sistema.` };
    default: return { cor: "#3fb8ff", topo: "RELATÓRIO SEMANAL", titulo: `${d.missoes}/${d.cobradas} missões`, linhas: [`+${d.xp} XP`, `Nível ${d.nivelIni} → ${d.nivelFim}`],
      texto: `Minha semana no O Sistema: ${d.missoes} de ${d.cobradas} missões, nível ${d.nivelIni} → ${d.nivelFim}.` };
  }
}

export async function gerarCard(tipo, d) {
  const c = conteudo(tipo, d), W = 1080, H = 1350;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const x = cv.getContext("2d");
  const g = x.createRadialGradient(W / 2, H * .42, 50, W / 2, H * .42, H * .8);
  g.addColorStop(0, "#0e1c3a"); g.addColorStop(1, "#02040a");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = "rgba(63,184,255,.06)"; x.lineWidth = 2;
  for (let i = 0; i < W; i += 60) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
  for (let i = 0; i < H; i += 60) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }
  x.strokeStyle = c.cor; x.lineWidth = 6; x.shadowColor = c.cor; x.shadowBlur = 30;
  x.strokeRect(50, 50, W - 100, H - 100);
  x.textAlign = "center"; x.fillStyle = c.cor; x.font = "700 40px Rajdhani, 'Segoe UI', sans-serif";
  x.fillText("[ O SISTEMA ]", W / 2, 150);
  x.shadowBlur = 0; x.fillStyle = "#bcd4ff"; x.font = "700 46px Rajdhani, 'Segoe UI', sans-serif";
  x.fillText(c.topo, W / 2, 250);
  let y = 330;
  if (c.arte) { const img = await svgImg(c.arte), h = c.quadrada ? 400 : 480; if (img) { x.drawImage(img, W / 2 - 200, y, 400, h); y += h + 40; } }
  else if (tipo === "rank") { // losango do rank
    x.save(); x.translate(W / 2, y + 230); x.rotate(Math.PI / 4); x.strokeStyle = c.cor; x.lineWidth = 12; x.shadowColor = c.cor; x.shadowBlur = 50;
    x.strokeRect(-160, -160, 320, 320); x.restore();
    x.fillStyle = "#fff"; x.shadowColor = c.cor; x.shadowBlur = 40; x.font = "800 220px Rajdhani, 'Segoe UI', sans-serif";
    x.fillText(d.rank, W / 2, y + 310); x.shadowBlur = 0; y += 560;
  } else y += 120;
  x.fillStyle = "#fff"; x.shadowColor = c.cor; x.shadowBlur = 36;
  x.font = `800 ${c.titulo.length > 16 ? 84 : 118}px Rajdhani, 'Segoe UI', sans-serif`;
  for (const l of quebrar(x, c.titulo, W - 180)) { x.fillText(l, W / 2, y); y += c.titulo.length > 16 ? 96 : 128; }
  x.shadowBlur = 0; x.fillStyle = c.cor; x.font = "700 52px Rajdhani, 'Segoe UI', sans-serif";
  for (const l of c.linhas.filter(Boolean)) { x.fillText(l, W / 2, y + 20); y += 70; }
  const li = levelInfo(), tit = tituloAtual();
  x.fillStyle = "#e2eeff"; x.font = "800 64px Rajdhani, 'Segoe UI', sans-serif";
  x.fillText((S.profile?.nome || "Caçador").toUpperCase(), W / 2, H - 230);
  x.fillStyle = "#7f95bb"; x.font = "600 40px Rajdhani, 'Segoe UI', sans-serif";
  x.fillText(`Rank ${li.rank} · Nível ${li.level}${tit && tit.id !== "mais-fraco" ? ` · ${tit.nome}` : ""}`, W / 2, H - 170);
  x.fillText(fmtDate(today()), W / 2, H - 115);
  return { canvas: cv, texto: c.texto };
}

actions.compartilhar = async ({ tipo, json }) => {
  toast("Gerando a imagem…");
  const { canvas, texto } = await gerarCard(tipo, JSON.parse(json || "{}"));
  const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
  const nome = `o-sistema-${tipo}-${today()}.png`;
  try {
    const file = new File([blob], nome, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: texto }); return; }
  } catch (e) { if (e?.name === "AbortError") return; }
  if (typeof nativo?.shareImage === "function") {
    const b64 = canvas.toDataURL("image/png").split(",")[1];
    if (nativo.shareImage(b64, texto)) return;
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(nativo ? "Para compartilhar direto, atualize o app Android para a versão 1.7. A imagem foi baixada." : "Imagem baixada: envie pelo WhatsApp.", 5000);
};
