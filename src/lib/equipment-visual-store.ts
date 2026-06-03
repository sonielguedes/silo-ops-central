import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { isAdminGlobal, type Role } from "@/lib/auth";

export const EQUIPMENT_VISUAL_STORE_PATH = process.env.EQUIPMENT_VISUAL_STORE_PATH || "/app/data/equipment-visual.json";

export interface VisualConfig {
  id: string;
  tipo_equipamento: string; // Ex: TRATOR, COLHEDORA
  icone: string; // ID do ícone (ex: trator, caminhao)
  cor_online: string;
  cor_instavel: string;
  cor_offline: string;
  rotaciona_icone: boolean;
  mostrar_label: boolean;
  ativo: boolean;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentVisualStore {
  configs: VisualConfig[];
}

const EMPTY_STORE: EquipmentVisualStore = {
  configs: [],
};

const SEED_CONFIGS: Partial<VisualConfig>[] = [
  { tipo_equipamento: "TRATOR", icone: "trator", cor_online: "#22c55e", cor_instavel: "#f59e0b", cor_offline: "#ef4444", rotaciona_icone: true, mostrar_label: true },
  { tipo_equipamento: "COLHEDORA", icone: "colhedora", cor_online: "#22c55e", cor_instavel: "#f59e0b", cor_offline: "#ef4444", rotaciona_icone: true, mostrar_label: true },
  { tipo_equipamento: "TRANSBORDO", icone: "transbordo", cor_online: "#22c55e", cor_instavel: "#f59e0b", cor_offline: "#ef4444", rotaciona_icone: true, mostrar_label: true },
  { tipo_equipamento: "CAMINHAO", icone: "caminhao", cor_online: "#22c55e", cor_instavel: "#f59e0b", cor_offline: "#ef4444", rotaciona_icone: true, mostrar_label: true },
  { tipo_equipamento: "CAMINHAO_BASCULANTE", icone: "caminhao", cor_online: "#22c55e", cor_instavel: "#f59e0b", cor_offline: "#ef4444", rotaciona_icone: true, mostrar_label: true },
  { tipo_equipamento: "COMBOIO", icone: "comboio", cor_online: "#22c55e", cor_instavel: "#f59e0b", cor_offline: "#ef4444", rotaciona_icone: true, mostrar_label: true },
  { tipo_equipamento: "PIPA", icone: "caminhao", cor_online: "#22c55e", cor_instavel: "#f59e0b", cor_offline: "#ef4444", rotaciona_icone: true, mostrar_label: true },
  { tipo_equipamento: "PLANTADEIRA", icone: "plantadeira", cor_online: "#22c55e", cor_instavel: "#f59e0b", cor_offline: "#ef4444", rotaciona_icone: true, mostrar_label: true },
  { tipo_equipamento: "PULVERIZADOR", icone: "pulverizador", cor_online: "#22c55e", cor_instavel: "#f59e0b", cor_offline: "#ef4444", rotaciona_icone: true, mostrar_label: true },
  { tipo_equipamento: "MOTONIVELADORA", icone: "trator", cor_online: "#22c55e", cor_instavel: "#f59e0b", cor_offline: "#ef4444", rotaciona_icone: true, mostrar_label: true },
  { tipo_equipamento: "ESCAVADEIRA", icone: "escavadeira", cor_online: "#22c55e", cor_instavel: "#f59e0b", cor_offline: "#ef4444", rotaciona_icone: true, mostrar_label: true },
  { tipo_equipamento: "PA_CARREGADEIRA", icone: "carregadeira", cor_online: "#22c55e", cor_instavel: "#f59e0b", cor_offline: "#ef4444", rotaciona_icone: true, mostrar_label: true },
  { tipo_equipamento: "DEFAULT", icone: "default", cor_online: "#4a6a8a", cor_instavel: "#f59e0b", cor_offline: "#ef4444", rotaciona_icone: false, mostrar_label: true },
];

let writeQueue: Promise<void> = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

async function ensureStoreDirectory() {
  await mkdir(dirname(EQUIPMENT_VISUAL_STORE_PATH), { recursive: true });
}

async function ensureStoreFile() {
  await ensureStoreDirectory();
  try {
    await readFile(EQUIPMENT_VISUAL_STORE_PATH, "utf8");
  } catch {
    const store = { ...EMPTY_STORE };
    const now = nowIso();

    store.configs = SEED_CONFIGS.map((conf) => ({
      id: `vis_${randomUUID().slice(0, 8)}`,
      tipo_equipamento: conf.tipo_equipamento!,
      icone: conf.icone!,
      cor_online: conf.cor_online!,
      cor_instavel: conf.cor_instavel!,
      cor_offline: conf.cor_offline!,
      rotaciona_icone: conf.rotaciona_icone ?? true,
      mostrar_label: conf.mostrar_label ?? true,
      ativo: true,
      empresa_id: "SILOOPS",
      created_at: now,
      updated_at: now,
    }));

    await writeFile(EQUIPMENT_VISUAL_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  }
}

async function withWriteQueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(() => undefined, () => undefined);
  return run;
}

export async function readEquipmentVisualStore(): Promise<EquipmentVisualStore> {
  await ensureStoreFile();
  try {
    const raw = await readFile(EQUIPMENT_VISUAL_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<EquipmentVisualStore>;
    return {
      configs: Array.isArray(parsed.configs) ? parsed.configs : [],
    };
  } catch {
    return { ...EMPTY_STORE };
  }
}

export async function writeEquipmentVisualStore(store: EquipmentVisualStore): Promise<void> {
  await ensureStoreFile();
  await writeFile(EQUIPMENT_VISUAL_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function upsertVisualConfig(input: Partial<VisualConfig>, session: { role: Role; empresa_id: string }) {
  if (!input.tipo_equipamento || !input.icone) {
    throw new Error("tipo_equipamento e icone são obrigatórios");
  }

  const empresaId = isAdminGlobal(session) ? (input.empresa_id || session.empresa_id) : session.empresa_id;

  return withWriteQueue(async () => {
    const store = await readEquipmentVisualStore();
    const now = nowIso();
    const id = input.id || `vis_${randomUUID().slice(0, 8)}`;

    // Uniqueness: tipo_equipamento per empresa
    const duplicate = store.configs.find(c =>
      c.id !== id &&
      c.tipo_equipamento === input.tipo_equipamento &&
      c.empresa_id === empresaId
    );
    if (duplicate) throw new Error("Configuração já existe para este tipo de equipamento");

    const existingIndex = store.configs.findIndex(c => c.id === id);
    const existing = existingIndex >= 0 ? store.configs[existingIndex] : null;

    if (existing && !isAdminGlobal(session) && existing.empresa_id !== session.empresa_id) {
      throw new Error("Acesso negado para este registro");
    }

    const next: VisualConfig = {
      id,
      tipo_equipamento: input.tipo_equipamento!,
      icone: input.icone!,
      cor_online: input.cor_online ?? existing?.cor_online ?? "#22c55e",
      cor_instavel: input.cor_instavel ?? existing?.cor_instavel ?? "#f59e0b",
      cor_offline: input.cor_offline ?? existing?.cor_offline ?? "#ef4444",
      rotaciona_icone: input.rotaciona_icone ?? existing?.rotaciona_icone ?? true,
      mostrar_label: input.mostrar_label ?? existing?.mostrar_label ?? true,
      ativo: input.ativo ?? existing?.ativo ?? true,
      empresa_id: empresaId,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    if (existingIndex >= 0) {
      store.configs[existingIndex] = next;
    } else {
      store.configs.push(next);
    }

    await writeEquipmentVisualStore(store);
    return next;
  });
}
