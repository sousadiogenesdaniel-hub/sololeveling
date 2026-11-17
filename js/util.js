// Utilidades gerais (datas, formatação, DOM)
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const p2 = n => String(n).padStart(2, "0");
export function iso(d = new Date()) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
// "?hoje=AAAA-MM-DD" na URL permite simular outro dia (usado nos testes).
const fakeToday = new URLSearchParams(location.search).get("hoje");
export const today = () => fakeToday || iso();
export function parseDay(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
export function addDays(s, n) { const d = parseDay(s); d.setDate(d.getDate() + n); return iso(d); }
export function daysBetween(a, b) { return Math.round((parseDay(b) - parseDay(a)) / 86400000); }
export const weekday = s => parseDay(s).getDay(); // 0 = domingo
export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export function fmtDate(s, opts = { day: "2-digit", month: "2-digit", year: "numeric" }) {
  return parseDay(s).toLocaleDateString("pt-BR", opts);
}
export const fmtShort = s => fmtDate(s, { day: "2-digit", month: "2-digit" });
export function fmtTime(t) { const d = new Date(t); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; }

export function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
export function fmt(n, dec = 0) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
export const signed = (n, dec = 1) => (n > 0 ? "+" : "") + fmt(n, dec);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const uid = () => Math.random().toString(36).slice(2, 10);

// Distância em metros entre duas coordenadas (haversine)
export function distM(a, b) {
  const R = 6371000, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Este aparelho não tem GPS disponível no navegador."));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      e => reject(new Error(e.code === 1
        ? "Permissão de localização negada. Libere o GPS para este app nas configurações do navegador."
        : "Não consegui obter sua localização. Vá para um lugar aberto e tente de novo.")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  });
}

// Leitura PRECISA: acompanha o GPS até a precisão ficar boa (ou o tempo acabar) e devolve a melhor leitura.
// Recusa localização aproximada (o Android entrega um ponto com erro de quilômetros quando a
// "Localização precisa" está desligada para o navegador).
export const GPS = { boa: 30, aceitavel: 100 }; // metros
export function getPreciseFix({ maxWait = 25000, onUpdate } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Este aparelho não tem GPS disponível no navegador."));
    let best = null, done = false;
    const finish = () => {
      if (done) return; done = true;
      navigator.geolocation.clearWatch(id); clearTimeout(timer);
      if (!best) return reject(new Error("Não consegui obter sua localização. Vá para um lugar aberto e tente de novo."));
      if (best.acc > GPS.aceitavel) {
        return reject(new Error(best.acc >= 1000
          ? `O celular entregou só uma localização APROXIMADA (erro de ${(best.acc / 1000).toFixed(1).replace(".", ",")} km). Ative "Localização precisa" para o Chrome: Configurações → Apps → Chrome → Permissões → Local → Usar local preciso.`
          : `O sinal de GPS está fraco (erro de ${best.acc} m). Vá para um lugar aberto, espere alguns segundos e tente de novo.`));
      }
      resolve(best);
    };
    const id = navigator.geolocation.watchPosition(p => {
      const fix = { lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy) };
      if (!best || fix.acc < best.acc) best = fix;
      onUpdate?.(best);
      if (best.acc <= GPS.boa) finish();
    }, e => {
      if (e.code === 1) { done = true; navigator.geolocation.clearWatch(id); clearTimeout(timer);
        return reject(new Error("Permissão de localização negada. Libere a localização (precisa) para este app nas configurações do navegador.")); }
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: maxWait });
    const timer = setTimeout(finish, maxWait);
  });
}

// Reduz uma imagem (File/Blob) para no máximo `max` px e devolve um Blob JPEG
export async function shrinkImage(file, max = 1600, quality = 0.85) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, "image/jpeg", quality));
}

export const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
