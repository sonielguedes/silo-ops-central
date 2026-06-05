import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { type EquipmentMasterRecord } from "@/lib/equipment-master-store";

export const SERVER_STORAGE_PATH = (process.env.SERVER_STORAGE_PATH || "/app/data/mobile-server-storage.json").trim();

export interface MobileEquipmentItem {
  id: string;
  frota: string;
  nome: string;
  tipo_equipamento: string;
  tenant_id: string;
  status: string;
  mobile_enabled: boolean;
  updated_at: string;
}

let writeQueue: Promise<void> = Promise.resolve();

async function withWriteQueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(() => undefined, () => undefined);
  return run;
}

export async function syncServerStorage(items: EquipmentMasterRecord[]) {
  return withWriteQueue(async () => {
    await mkdir(dirname(SERVER_STORAGE_PATH), { recursive: true });

    // Simplified list for mobile consumption
    const mobileItems: MobileEquipmentItem[] = items
      .filter(item => item.status === "ATIVO" && item.mobile_enabled)
      .map(item => ({
        id: item.id,
        frota: item.frota,
        nome: item.nome,
        tipo_equipamento: item.tipo_equipamento,
        tenant_id: item.tenant_id,
        status: item.status,
        mobile_enabled: item.mobile_enabled,
        updated_at: item.updated_at
      }));

    await writeFile(SERVER_STORAGE_PATH, JSON.stringify(mobileItems, null, 2), "utf8");
  });
}

/** @deprecated use syncServerStorage */
export const syncMobileEquipment = syncServerStorage;

export async function readServerStorage(): Promise<MobileEquipmentItem[]> {
  try {
    const raw = await readFile(SERVER_STORAGE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
