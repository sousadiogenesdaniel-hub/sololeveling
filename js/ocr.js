// Leitura de prints no próprio aparelho (Tesseract.js embutido, funciona offline): comprovantes de PIX
const BASE = new URL("../vendor/tesseract/", import.meta.url).href;

let loading = null;
function loadLib() {
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = BASE + "tesseract.min.js";
      s.onload = resolve; s.onerror = () => { loading = null; reject(new Error("Não consegui carregar o leitor de imagens.")); };
      document.head.append(s);
    });
  }
  return loading;
}

// Prepara o print para o OCR: escala de cinza, amplia e binariza por contraste local.
// Cada pixel vira preto se for bem diferente da média ao redor (texto), senão branco (fundo).
// Assim funciona igual no modo claro, no modo escuro e dentro dos balões coloridos.
// Versão simples: só cinza + ampliação (e inverte se o fundo for escuro). Melhor para comprovantes
// de fundo claro, onde a binarização local "esvazia" letras grandes e grossas.
async function prepareGray(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(3, Math.max(1, 1800 / bmp.width));
  const c = document.createElement("canvas");
  const W = c.width = Math.round(bmp.width * k), H = c.height = Math.round(bmp.height * k);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H), px = img.data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) { const v = px[i] * .299 + px[i + 1] * .587 + px[i + 2] * .114; px[i] = px[i + 1] = px[i + 2] = v; sum += v; }
  if (sum / (px.length / 4) < 110) for (let i = 0; i < px.length; i += 4) px[i] = px[i + 1] = px[i + 2] = 255 - px[i];
  ctx.putImageData(img, 0, 0);
  return c;
}

async function prepare(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(2.5, Math.max(1, 1600 / bmp.width));
  const c = document.createElement("canvas");
  const W = c.width = Math.round(bmp.width * k), H = c.height = Math.round(bmp.height * k);
  const ctx = c.getContext("2d");
  ctx.drawImage(bmp, 0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H), px = img.data;
  const gray = new Float32Array(W * H), integ = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let rowSum = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, v = px[i] * .299 + px[i + 1] * .587 + px[i + 2] * .114;
      gray[y * W + x] = v; rowSum += v;
      integ[(y + 1) * (W + 1) + x + 1] = integ[y * (W + 1) + x + 1] + rowSum;
    }
  }
  const R = 24, T = 38;
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - R), y1 = Math.min(H, y + R + 1);
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - R), x1 = Math.min(W, x + R + 1);
      const sum = integ[y1 * (W + 1) + x1] - integ[y0 * (W + 1) + x1] - integ[y1 * (W + 1) + x0] + integ[y0 * (W + 1) + x0];
      const mean = sum / ((x1 - x0) * (y1 - y0));
      const i = (y * W + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = Math.abs(gray[y * W + x] - mean) > T ? 0 : 255;
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// mode: "pix" = comprovante (cinza simples, depois binarizado como reserva) · padrão = só binarizado
export async function readText(file, onProgress, mode) {
  await loadLib();
  const worker = await window.Tesseract.createWorker("por", 1, {
    workerPath: BASE + "worker.min.js", corePath: BASE, langPath: BASE, gzip: true,
    logger: m => { if (m.status === "recognizing text") onProgress?.(m.progress); },
  });
  try {
    const passes = mode === "pix"
      ? [[await prepareGray(file), "4"], [await prepareGray(file), "11"], [await prepare(file), "6"]]
      : [[await prepare(file), "6"], [await prepare(file), "11"]];
    const texts = [];
    for (const [canvas, psm] of passes) {
      await worker.setParameters({ tessedit_pageseg_mode: psm });
      texts.push((await worker.recognize(canvas)).data.text);
    }
    return mode === "pix" ? texts : texts.join("\n");
  } finally { await worker.terminate(); }
}

// Procura `needle` em `hay` aceitando até `k` caracteres trocados
function fuzzyHas(hay, needle, k) {
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let miss = 0;
    for (let j = 0; j < needle.length && miss <= k; j++) if (hay[i + j] !== needle[j]) miss++;
    if (miss <= k) return true;
  }
  return false;
}

const norm = t => t.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const STOP = new Set(["DE", "DA", "DO", "DAS", "DOS", "E"]);
const tokens = nome => norm(nome).split(/[^A-Z]+/).filter(w => w.length >= 2 && !STOP.has(w));

function parseOne(text, membros) {
  const T = norm(text);
  const r = { pix: /\bPIX\b/.test(T) };
  const toV = x => parseFloat(x.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  // 1º: número logo depois de "VALOR" (com ou sem R$; o comprovante SISBB do BB mostra "VALOR: 10,00")
  const lab = [...T.matchAll(/VALOR(?!\s*DA\s*TARIFA)[^\d]{0,14}?(\d{1,3}(?:\.\d{3})*,\s?\d{2})/g)].map(m => toV(m[1])).find(v => v > 0);
  // 2º: o primeiro "R$ x,xx" diferente de zero. O leitor às vezes lê o "$" como S, 5 ou § (ex.: "RS 20,00"
  // no comprovante novo do BB, em que o valor vem grande e colorido)
  const rs = [...T.matchAll(/\bR\s?[$S5§]\s*(\d{1,3}(?:\.\d{3})*,\s?\d{2})(?!\d)/g)].map(m => toV(m[1])).find(v => v > 0);
  // 3º: uma linha só com o valor (quando o "R$" sai ilegível)
  const so = [...T.matchAll(/^[^\dA-Z\n]{0,3}(?:R\S{0,2})?\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/gm)].map(m => toV(m[1])).find(v => v > 0);
  r.valor = lab ?? rs ?? so ?? null;
  const dm = T.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  r.data = dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : null;
  const hm = T.match(/(?<!\d)([01]\d|2[0-3])[:h]([0-5]\d)(?![\d\/])/);
  r.hora = hm ? `${hm[1]}:${hm[2]}` : null;
  // ID da transação (E2E): "E" + 8 dígitos do banco + data/hora (12 dígitos) + 11 caracteres. Só aceita se ficar válido.
  const flat = T.replace(/\s+/g, "");
  r.id = null;
  for (const m of flat.matchAll(/E[0-9OIL]{20}[A-Z0-9]{11}/g)) {
    const dig = m[0].slice(1, 21).replace(/O/g, "0").replace(/[IL]/g, "1");
    if (/^\d{8}20\d{10}$/.test(dig)) { r.id = "E" + dig + m[0].slice(21); break; }
  }
  // recebedor: alguém do grupo cujo primeiro nome e mais um sobrenome aparecem (aceita 1 letra trocada),
  // de preferência no trecho depois de "Para"/"Recebedor"
  const near = (w, x) => x === w || (w.length >= 5 && x.length === w.length && [...w].filter((c, i) => c !== x[i]).length <= 1);
  const acha = zona => { const ws = zona.split(/[^A-Z]+/).filter(Boolean), has = w => ws.some(x => near(w, x));
    return membros.find(m => { const t = tokens(m.nome); return t.length && has(t[0]) && (t.length === 1 || t.slice(1).some(has)); }) || null; };
  const iRec = T.search(/RECEBEDOR|FAVORECIDO|DESTINO|PARA\b|QUEM RECEBEU/);
  r.membro = (iRec >= 0 && acha(T.slice(iRec))) || acha(T);
  return r;
}

// Lê um comprovante de PIX (Banco do Brasil e outros bancos, de forma tolerante). Aceita o texto de várias
// leituras da mesma imagem: o valor é o que aparece na maioria; os outros campos, o primeiro encontrado.
export function parsePix(texts, membros) {
  const rs = (Array.isArray(texts) ? texts : [texts]).map(t => parseOne(t, membros));
  const first = k => rs.map(r => r[k]).find(v => v != null && v !== false) ?? null;
  const votos = {}; rs.forEach(r => { if (r.valor) votos[r.valor] = (votos[r.valor] || 0) + 1; });
  const valor = Object.keys(votos).length ? +Object.entries(votos).sort((a, b) => b[1] - a[1] || rs.findIndex(r => r.valor === +a[0]) - rs.findIndex(r => r.valor === +b[0]))[0][0] : null;
  return { pix: rs.some(r => r.pix), valor, data: first("data"), hora: first("hora"), id: first("id"), membro: first("membro") };
}

// Regras para aceitar um comprovante numa dívida
export function checkPix(r, debt, { today, usados }) {
  const prob = [];
  if (!r.pix) prob.push("não parece um comprovante de PIX");
  if (!r.valor) prob.push("não encontrei o valor (R$)");
  if (!r.data) prob.push("não encontrei a data");
  else if (r.data < debt.date) prob.push(`o PIX é de ${r.data.split("-").reverse().join("/")}, antes da falta`);
  else if (r.data > today) prob.push("a data do PIX está no futuro");
  if (!r.membro) prob.push("o recebedor não é ninguém do grupo (confira o nome cadastrado)");
  if (!r.hora) prob.push("não encontrei o horário do PIX");
  // assinatura do comprovante (campos que o leitor pega com segurança) + o ID quando legível
  const chave = `${r.data}|${r.hora}|${r.valor}|${r.membro?.id}`;
  if (usados.includes(chave) || (r.id && usados.includes(r.id))) prob.push("este comprovante já foi usado");
  return { ok: !prob.length, prob, chave };
}
