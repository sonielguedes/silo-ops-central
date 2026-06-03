import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export const OPERATION_REGISTRY_STORE_PATH = process.env.OPERATION_REGISTRY_STORE_PATH || "/app/data/operation-registry.json";

export interface Operacao {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  grupo_operacao: string;
  tipo_aplicacao: string;
  produtiva: boolean;
  exige_talhao: boolean;
  exige_implemento: boolean;
  ativo: boolean;
  empresa_id: string;
  usina_id: string;
  unidade_id: string;
  created_at: string;
  updated_at: string;
}

export type TipoParada = 'OPERACIONAL' | 'MANUTENCAO' | 'CLIMA' | 'LOGISTICA' | 'SEGURANCA' | 'OUTROS';

export interface Parada {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  grupo_parada: string;
  tipo: TipoParada;
  produtiva: boolean;
  bloqueia_operacao: boolean;
  exige_observacao: boolean;
  ativo: boolean;
  empresa_id: string;
  usina_id: string;
  unidade_id: string;
  created_at: string;
  updated_at: string;
}

export interface OperationRegistryStore {
  operacoes: Operacao[];
  paradas: Parada[];
}

const EMPTY_STORE: OperationRegistryStore = {
  operacoes: [],
  paradas: [],
};

const SEED_OPERACOES: Partial<Operacao>[] = [
  { codigo: "PREPARANDO_SOLO", nome: "Preparando Solo", grupo_operacao: "PREPARO" },
  { codigo: "PLANTIO", nome: "Plantio", grupo_operacao: "PLANTIO" },
  { codigo: "COLHEITA", nome: "Colheita", grupo_operacao: "COLHEITA" },
  { codigo: "TRANSBORDO", nome: "Transbordo", grupo_operacao: "LOGISTICA" },
  { codigo: "TRANSPORTE", nome: "Transporte", grupo_operacao: "LOGISTICA" },
  { codigo: "MANUTENCAO_CAMPO", nome: "Manutenção Campo", grupo_operacao: "MANUTENCAO" },
];

const SEED_PARADAS: Partial<Parada>[] = [
  { codigo: "SEM_OPERADOR", nome: "Sem Operador", tipo: "OPERACIONAL" },
  { codigo: "MANUTENCAO", nome: "Manutenção", tipo: "MANUTENCAO" },
  { codigo: "ABASTECIMENTO", nome: "Abastecimento", tipo: "LOGISTICA" },
  { codigo: "AGUARDANDO_TRANSBORDO", nome: "Aguardando Transbordo", tipo: "LOGISTICA" },
  { codigo: "CHUVA", nome: "Chuva", tipo: "CLIMA" },
  { codigo: "FALTA_FRENTE", nome: "Falta Frente", tipo: "LOGISTICA" },
  { codigo: "REFEICAO", nome: "Refeição", tipo: "OPERACIONAL" },
];

let writeQueue: Promise<void> = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

async function ensureStoreDirectory() {
  await mkdir(dirname(OPERATION_REGISTRY_STORE_PATH), { recursive: true });
}

async function ensureStoreFile() {
  await ensureStoreDirectory();
  try {
    await readFile(OPERATION_REGISTRY_STORE_PATH, "utf8");
  } catch {
    const store = { ...EMPTY_STORE };
    const now = nowIso();

    store.operacoes = SEED_OPERACOES.map((op, index) => ({
      id: `op_${randomUUID().slice(0, 8)}`,
      codigo: op.codigo!,
      nome: op.nome!,
      descricao: "",
      grupo_operacao: op.grupo_operacao || "GERAL",
      tipo_aplicacao: "GERAL",
      produtiva: true,
      exige_talhao: false,
      exige_implemento: false,
      ativo: true,
      empresa_id: "SILOOPS",
      usina_id: "USINA_PADRAO",
      unidade_id: "UNIDADE_PADRAO",
      created_at: now,
      updated_at: now,
    }));

    store.paradas = SEED_PARADAS.map((p, index) => ({
      id: `pa_${randomUUID().slice(0, 8)}`,
      codigo: p.codigo!,
      nome: p.nome!,
      descricao: "",
      grupo_parada: "GERAL",
      tipo: p.tipo as TipoParada,
      produtiva: false,
      bloqueia_operacao: true,
      exige_observacao: false,
      ativo: true,
      empresa_id: "SILOOPS",
      usina_id: "USINA_PADRAO",
      unidade_id: "UNIDADE_PADRAO",
      created_at: now,
      updated_at: now,
    }));

    await writeFile(OPERATION_REGISTRY_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  }
}

async function withWriteQueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(() => undefined, () => undefined);
  return run;
}

export async function readOperationRegistryStore(): Promise<OperationRegistryStore> {
  await ensureStoreFile();
  try {
    const raw = await readFile(OPERATION_REGISTRY_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<OperationRegistryStore>;
    return {
      operacoes: Array.isArray(parsed.operacoes) ? parsed.operacoes : [],
      paradas: Array.isArray(parsed.paradas) ? parsed.paradas : [],
    };
  } catch {
    return { ...EMPTY_STORE };
  }
}

export async function writeOperationRegistryStore(store: OperationRegistryStore): Promise<void> {
  await ensureStoreFile();
  await writeFile(OPERATION_REGISTRY_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function upsertOperacao(input: Partial<Operacao>) {
  if (!input.codigo || !input.nome || !input.empresa_id) {
    throw new Error("codigo, nome e empresa_id são obrigatórios");
  }

  return withWriteQueue(async () => {
    const store = await readOperationRegistryStore();
    const now = nowIso();
    const id = input.id || `op_${randomUUID().slice(0, 8)}`;
    const existingIndex = store.operacoes.findIndex((item) => item.id === id);

    // Check if code is unique per empresa/usina/unidade
    const duplicate = store.operacoes.find(op =>
      op.id !== id &&
      op.codigo === input.codigo &&
      op.empresa_id === input.empresa_id &&
      op.usina_id === (input.usina_id || "USINA_PADRAO") &&
      op.unidade_id === (input.unidade_id || "UNIDADE_PADRAO")
    );
    if (duplicate) throw new Error("Código já existe para esta Unidade");

    const existing = existingIndex >= 0 ? store.operacoes[existingIndex] : null;

    const next: Operacao = {
      id,
      codigo: input.codigo!,
      nome: input.nome!,
      descricao: input.descricao ?? existing?.descricao ?? "",
      grupo_operacao: input.grupo_operacao ?? existing?.grupo_operacao ?? "GERAL",
      tipo_aplicacao: input.tipo_aplicacao ?? existing?.tipo_aplicacao ?? "GERAL",
      produtiva: input.produtiva ?? existing?.produtiva ?? true,
      exige_talhao: input.exige_talhao ?? existing?.exige_talhao ?? false,
      exige_implemento: input.exige_implemento ?? existing?.exige_implemento ?? false,
      ativo: input.ativo ?? existing?.ativo ?? true,
      empresa_id: input.empresa_id!,
      usina_id: input.usina_id ?? existing?.usina_id ?? "USINA_PADRAO",
      unidade_id: input.unidade_id ?? existing?.unidade_id ?? "UNIDADE_PADRAO",
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    if (existingIndex >= 0) {
      store.operacoes[existingIndex] = next;
    } else {
      store.operacoes.push(next);
    }

    await writeOperationRegistryStore(store);
    return next;
  });
}

export async function upsertParada(input: Partial<Parada>) {
  if (!input.codigo || !input.nome || !input.empresa_id) {
    throw new Error("codigo, nome e empresa_id são obrigatórios");
  }

  return withWriteQueue(async () => {
    const store = await readOperationRegistryStore();
    const now = nowIso();
    const id = input.id || `pa_${randomUUID().slice(0, 8)}`;
    const existingIndex = store.paradas.findIndex((item) => item.id === id);

    // Check if code is unique per empresa/usina/unidade
    const duplicate = store.paradas.find(p =>
      p.id !== id &&
      p.codigo === input.codigo &&
      p.empresa_id === input.empresa_id &&
      p.usina_id === (input.usina_id || "USINA_PADRAO") &&
      p.unidade_id === (input.unidade_id || "UNIDADE_PADRAO")
    );
    if (duplicate) throw new Error("Código já existe para esta Unidade");

    const existing = existingIndex >= 0 ? store.paradas[existingIndex] : null;

    const next: Parada = {
      id,
      codigo: input.codigo!,
      nome: input.nome!,
      descricao: input.descricao ?? existing?.descricao ?? "",
      grupo_parada: input.grupo_parada ?? existing?.grupo_parada ?? "GERAL",
      tipo: (input.tipo as TipoParada) ?? existing?.tipo ?? "OPERACIONAL",
      produtiva: input.produtiva ?? existing?.produtiva ?? false,
      bloqueia_operacao: input.bloqueia_operacao ?? existing?.bloqueia_operacao ?? true,
      exige_observacao: input.exige_observacao ?? existing?.exige_observacao ?? false,
      ativo: input.ativo ?? existing?.ativo ?? true,
      empresa_id: input.empresa_id!,
      usina_id: input.usina_id ?? existing?.usina_id ?? "USINA_PADRAO",
      unidade_id: input.unidade_id ?? existing?.unidade_id ?? "UNIDADE_PADRAO",
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    if (existingIndex >= 0) {
      store.paradas[existingIndex] = next;
    } else {
      store.paradas.push(next);
    }

    await writeOperationRegistryStore(store);
    return next;
  });
}
