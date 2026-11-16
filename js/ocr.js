// Leitura do print do WhatsApp no próprio aparelho (Tesseract.js embutido, funciona offline)
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

export async function readText(file, onProgress) {
  await loadLib();
  const worker = await window.Tesseract.createWorker("por", 1, {
    workerPath: BASE + "worker.min.js", corePath: BASE, langPath: BASE, gzip: true,
    logger: m => { if (m.status === "recognizing text") onProgress?.(m.progress); },
  });
  try {
    const canvas = await prepare(file);
    let text = "";
    // duas passadas: bloco de texto e texto esparso (balões de conversa)
    for (const psm of ["6", "11"]) {
      await worker.setParameters({ tessedit_pageseg_mode: psm });
      text += (await worker.recognize(canvas)).data.text + "\n";
    }
    return text;
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

// Confere se o texto lido do print contém a mensagem de penalidade daquele dia
export function checkProof(text, debt) {
  const T = text.toUpperCase().normalize("NFD").replace(/[^A-Z0-9]/g, "");
  const [, ymd, code] = debt.serial.split("-");
  const r = {
    codigo: fuzzyHas(T, code, 1) && fuzzyHas(T, "PEN" + ymd, 2),
    texto: /DEVO|PENALIDADE|NAOBATI/.test(T),
    // horário da mensagem enviada (o OCR às vezes perde os dois-pontos: "21:47" vira "2147")
    hora: /(?<![\d\/,.:])([01]?\d|2[0-3])[:.]?[0-5]\d(?![\d\/,:])/.test(text),
  };
  r.ok = r.codigo && r.texto && r.hora;
  return r;
}
