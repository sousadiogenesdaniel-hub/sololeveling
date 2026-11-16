// Persistência: um único objeto de estado no IndexedDB + um armazém separado para fotos.
import { today, uid } from "./util.js";

const DB_NAME = "sistema-db";
let dbp = null;

function db() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("kv");
        const ph = req.result.createObjectStore("photos", { keyPath: "id" });
        ph.createIndex("date", "date");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

function tx(store, mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => resolve(r && "result" in r ? r.result : undefined);
    t.onerror = () => reject(t.error);
  }));
}

export const DEFAULT_SHOP = [
  { id: "pizza", nome: "Pizza", icone: "🍕", custo: 600 },
  { id: "hamburguer", nome: "Hambúrguer", icone: "🍔", custo: 500 },
  { id: "salgadinho", nome: "Salgadinhos", icone: "🥟", custo: 350 },
  { id: "sorvete", nome: "Sorvete", icone: "🍨", custo: 300 },
  { id: "doce", nome: "Doce / sobremesa", icone: "🍫", custo: 250 },
  { id: "refri", nome: "Refrigerante", icone: "🥤", custo: 150 },
];

export const DEFAULT_MEALS = ["Café da manhã", "Almoço", "Lanche", "Janta"];

function blank() {
  return {
    v: 1,
    profile: null,
    track: null,                 // { id, startDate }
    progress: {},                // por trilha: { phase, week, sessions }
    game: { xp: 0, gold: 0, lastProcessed: null, needsWorkout: false, streak: 0, bestStreak: 0, log: [] },
    debts: [],                   // { date, serial, status, validatedAt }
    diet: { meals: DEFAULT_MEALS.map(nome => ({ id: uid(), nome, itens: [] })) },
    foods: [],                   // alimentos próprios
    days: {},                    // por data
    weekly: {},                  // medidas semanais por data
    shop: DEFAULT_SHOP,
    purchases: [],               // { date, nome, icone, custo }
  };
}

export let S = blank();

export async function load() {
  const saved = await tx("kv", "readonly", s => s.get("state"));
  if (saved) S = { ...blank(), ...saved, game: { ...blank().game, ...saved.game } };
  return S;
}

let saving = Promise.resolve();
export function save() {
  const snapshot = JSON.parse(JSON.stringify(S));
  saving = saving.then(() => tx("kv", "readwrite", s => s.put(snapshot, "state")));
  return saving;
}

export function day(date = today()) {
  if (!S.days[date]) S.days[date] = {};
  return S.days[date];
}

export async function resetAll() {
  await tx("kv", "readwrite", s => s.clear());
  await tx("photos", "readwrite", s => s.clear());
  S = blank();
}

export function replaceState(obj) { S = { ...blank(), ...obj }; return save(); }

// ---- fotos -------------------------------------------------------------------
export const photos = {
  add: p => tx("photos", "readwrite", s => s.put({ id: uid(), criado: Date.now(), ...p })),
  all: () => tx("photos", "readonly", s => s.getAll()),
  del: id => tx("photos", "readwrite", s => s.delete(id)),
};
