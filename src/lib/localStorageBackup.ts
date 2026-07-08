export const STOCK_TREND_LOCAL_STORAGE_PREFIX = "stock-trend-mvp:";
export const LOCAL_STORAGE_BACKUP_APP_ID = "stock-trend-mvp";
export const LOCAL_STORAGE_BACKUP_SCHEMA_VERSION = "local-storage-backup-v1";
export const CORRUPT_STOCKS_BACKUP_KEY_PREFIX = `${STOCK_TREND_LOCAL_STORAGE_PREFIX}stocks:corrupt:`;
export const PRE_RESTORE_SNAPSHOT_KEY_PREFIX = `${STOCK_TREND_LOCAL_STORAGE_PREFIX}restore:pre:`;
export const LOCAL_STORAGE_BACKUP_EXCLUDED_PREFIXES = [
  CORRUPT_STOCKS_BACKUP_KEY_PREFIX,
  PRE_RESTORE_SNAPSHOT_KEY_PREFIX,
];

export type LocalStorageLike = {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

export type LocalStorageBackupPayload = {
  appId: typeof LOCAL_STORAGE_BACKUP_APP_ID;
  schemaVersion: typeof LOCAL_STORAGE_BACKUP_SCHEMA_VERSION;
  createdAt: string;
  keyPrefix: typeof STOCK_TREND_LOCAL_STORAGE_PREFIX;
  keys: string[];
  entries: Record<string, string>;
};

export type BackupResult =
  | {
      ok: true;
      payload: LocalStorageBackupPayload;
      json: string;
      keys: string[];
      message: string;
    }
  | {
      ok: false;
      keys: string[];
      message: string;
    };

export type ParsedBackupResult =
  | {
      ok: true;
      payload: LocalStorageBackupPayload;
      restoreKeys: string[];
      skippedKeys: string[];
      message: string;
    }
  | {
      ok: false;
      restoreKeys: string[];
      skippedKeys: string[];
      message: string;
    };

export type RestoreResult = {
  ok: boolean;
  restoredKeys: string[];
  skippedKeys: string[];
  message: string;
};

export type PreRestoreSnapshotResult =
  | {
      ok: true;
      key: string;
      payload: LocalStorageBackupPayload;
      json: string;
      keys: string[];
      message: string;
    }
  | {
      ok: false;
      key: string;
      keys: string[];
      message: string;
    };

export type RestoreWithPreSnapshotResult = RestoreResult & {
  preRestoreSnapshot: PreRestoreSnapshotResult;
};

export type EvacuatedLocalStorageEntry = {
  key: string;
  kind: "corrupt-stocks" | "pre-restore";
  sizeBytes: number;
};

export type DeleteEvacuatedLocalStorageEntryResult =
  | {
      ok: true;
      key: string;
      message: string;
    }
  | {
      ok: false;
      key: string;
      message: string;
    };

type CreateBackupOptions = {
  excludeKeyPrefixes?: string[];
};

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|apikey|authorization|bearer|token|secret|password|openai)/i;
const SENSITIVE_VALUE_PATTERN = /(\bsk-[A-Za-z0-9_-]{12,}|OPENAI_API_KEY|Bearer\s+[A-Za-z0-9._-]{12,}|AIza[0-9A-Za-z_-]{20,})/;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringifyForSensitiveScan(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function listStockTrendLocalStorageKeys(storage: LocalStorageLike, options: CreateBackupOptions = {}): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(STOCK_TREND_LOCAL_STORAGE_PREFIX) && !options.excludeKeyPrefixes?.some((prefix) => key.startsWith(prefix))) {
      keys.push(key);
    }
  }
  return keys.sort((a, b) => a.localeCompare(b));
}

function estimateStorageEntryBytes(key: string, value: string): number {
  return (key.length + value.length) * 2;
}

function getEvacuatedEntryKind(key: string): EvacuatedLocalStorageEntry["kind"] | null {
  if (key.startsWith(CORRUPT_STOCKS_BACKUP_KEY_PREFIX)) return "corrupt-stocks";
  if (key.startsWith(PRE_RESTORE_SNAPSHOT_KEY_PREFIX)) return "pre-restore";
  return null;
}

export function listEvacuatedLocalStorageEntries(storage: LocalStorageLike): EvacuatedLocalStorageEntry[] {
  return listStockTrendLocalStorageKeys(storage)
    .map((key) => {
      const kind = getEvacuatedEntryKind(key);
      if (!kind) return null;
      const value = storage.getItem(key) ?? "";
      return {
        key,
        kind,
        sizeBytes: estimateStorageEntryBytes(key, value),
      };
    })
    .filter((entry): entry is EvacuatedLocalStorageEntry => entry !== null)
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function deleteEvacuatedLocalStorageEntry(storage: LocalStorageLike, key: string): DeleteEvacuatedLocalStorageEntryResult {
  if (!getEvacuatedEntryKind(key)) {
    return {
      ok: false,
      key,
      message: "退避データ以外のキーは削除できません。",
    };
  }

  if (!storage.removeItem) {
    return {
      ok: false,
      key,
      message: "この環境では退避データを削除できません。",
    };
  }

  try {
    storage.removeItem(key);
    return {
      ok: true,
      key,
      message: `${key} を削除しました。`,
    };
  } catch {
    return {
      ok: false,
      key,
      message: `${key} を削除できませんでした。ブラウザ設定を確認してください。`,
    };
  }
}

export function findSensitiveBackupEntries(entries: Record<string, string>): string[] {
  const matches: string[] = [];
  for (const [key, rawValue] of Object.entries(entries)) {
    if (SENSITIVE_VALUE_PATTERN.test(rawValue)) {
      matches.push(key);
      continue;
    }

    try {
      const parsed = JSON.parse(rawValue);
      const stack: Array<{ path: string; value: unknown }> = [{ path: key, value: parsed }];
      while (stack.length > 0) {
        const current = stack.pop();
        if (!current) continue;
        if (SENSITIVE_KEY_PATTERN.test(current.path) && stringifyForSensitiveScan(current.value).trim()) {
          matches.push(key);
          break;
        }
        if (Array.isArray(current.value)) {
          current.value.forEach((item, index) => stack.push({ path: `${current.path}.${index}`, value: item }));
        } else if (isPlainRecord(current.value)) {
          Object.entries(current.value).forEach(([childKey, childValue]) => stack.push({ path: `${current.path}.${childKey}`, value: childValue }));
        }
      }
    } catch {
      if (SENSITIVE_KEY_PATTERN.test(key) && rawValue.trim()) matches.push(key);
    }
  }
  return Array.from(new Set(matches)).sort((a, b) => a.localeCompare(b));
}

export function createLocalStorageBackup(storage: LocalStorageLike, createdAt = new Date().toISOString(), options: CreateBackupOptions = {}): BackupResult {
  const keys = listStockTrendLocalStorageKeys(storage, options);
  const entries: Record<string, string> = {};
  keys.forEach((key) => {
    const value = storage.getItem(key);
    if (value !== null) entries[key] = value;
  });

  const sensitiveKeys = findSensitiveBackupEntries(entries);
  if (sensitiveKeys.length > 0) {
    return {
      ok: false,
      keys,
      message: `APIキーらしい値を検出したため、バックアップを中止しました: ${sensitiveKeys.join(", ")}`,
    };
  }

  const payload: LocalStorageBackupPayload = {
    appId: LOCAL_STORAGE_BACKUP_APP_ID,
    schemaVersion: LOCAL_STORAGE_BACKUP_SCHEMA_VERSION,
    createdAt,
    keyPrefix: STOCK_TREND_LOCAL_STORAGE_PREFIX,
    keys: Object.keys(entries).sort((a, b) => a.localeCompare(b)),
    entries,
  };

  return {
    ok: true,
    payload,
    json: JSON.stringify(payload, null, 2),
    keys: payload.keys,
    message: `${payload.keys.length} 件のlocalStorageキーをバックアップできます。`,
  };
}

function formatSnapshotTimestamp(createdAt: string): string {
  const compact = createdAt.replace(/\D/g, "").slice(0, 14);
  return compact || new Date().toISOString().replace(/\D/g, "").slice(0, 14);
}

function listPreRestoreSnapshotKeys(storage: LocalStorageLike): string[] {
  return listStockTrendLocalStorageKeys(storage).filter((key) => key.startsWith(PRE_RESTORE_SNAPSHOT_KEY_PREFIX));
}

export function createPreRestoreLocalStorageSnapshot(storage: LocalStorageLike, createdAt = new Date().toISOString()): PreRestoreSnapshotResult {
  const backup = createLocalStorageBackup(storage, createdAt, { excludeKeyPrefixes: [PRE_RESTORE_SNAPSHOT_KEY_PREFIX] });
  const snapshotKey = `${PRE_RESTORE_SNAPSHOT_KEY_PREFIX}${formatSnapshotTimestamp(createdAt)}`;

  if (!backup.ok) {
    return {
      ok: false,
      key: snapshotKey,
      keys: backup.keys,
      message: `復元前スナップショットを作成できませんでした。${backup.message}`,
    };
  }

  try {
    storage.setItem(snapshotKey, backup.json);
  } catch {
    return {
      ok: false,
      key: snapshotKey,
      keys: backup.keys,
      message: "復元前スナップショットを保存できませんでした。localStorageの空き容量やブラウザ設定を確認してください。",
    };
  }

  listPreRestoreSnapshotKeys(storage)
    .filter((key) => key !== snapshotKey)
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      try {
        storage.removeItem?.(key);
      } catch {
        // Snapshot creation already succeeded. Do not block restore only because stale cleanup failed.
      }
    });

  return {
    ok: true,
    key: snapshotKey,
    payload: backup.payload,
    json: backup.json,
    keys: backup.keys,
    message: `復元前の状態を ${snapshotKey} に退避しました。`,
  };
}

export function parseLocalStorageBackupJson(text: string): ParsedBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, restoreKeys: [], skippedKeys: [], message: "JSONとして読み込めません。" };
  }

  if (!isPlainRecord(parsed)) {
    return { ok: false, restoreKeys: [], skippedKeys: [], message: "バックアップ形式が不正です。" };
  }
  if (parsed.appId !== LOCAL_STORAGE_BACKUP_APP_ID || parsed.schemaVersion !== LOCAL_STORAGE_BACKUP_SCHEMA_VERSION) {
    return { ok: false, restoreKeys: [], skippedKeys: [], message: "stock-trend-mvp の対応バックアップではありません。" };
  }
  if (parsed.keyPrefix !== STOCK_TREND_LOCAL_STORAGE_PREFIX || !isPlainRecord(parsed.entries)) {
    return { ok: false, restoreKeys: [], skippedKeys: [], message: "復元対象キーの形式が不正です。" };
  }

  const entries: Record<string, string> = {};
  const skippedKeys: string[] = [];
  Object.entries(parsed.entries).forEach(([key, value]) => {
    if (!key.startsWith(STOCK_TREND_LOCAL_STORAGE_PREFIX) || typeof value !== "string") {
      skippedKeys.push(key);
      return;
    }
    entries[key] = value;
  });

  const sensitiveKeys = findSensitiveBackupEntries(entries);
  if (sensitiveKeys.length > 0) {
    return {
      ok: false,
      restoreKeys: Object.keys(entries).sort((a, b) => a.localeCompare(b)),
      skippedKeys,
      message: `APIキーらしい値を検出したため、復元を中止しました: ${sensitiveKeys.join(", ")}`,
    };
  }

  const payload: LocalStorageBackupPayload = {
    appId: LOCAL_STORAGE_BACKUP_APP_ID,
    schemaVersion: LOCAL_STORAGE_BACKUP_SCHEMA_VERSION,
    createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : "",
    keyPrefix: STOCK_TREND_LOCAL_STORAGE_PREFIX,
    keys: Object.keys(entries).sort((a, b) => a.localeCompare(b)),
    entries,
  };

  return {
    ok: true,
    payload,
    restoreKeys: payload.keys,
    skippedKeys,
    message: `${payload.keys.length} 件のlocalStorageキーを復元対象として確認しました。`,
  };
}

export function restoreLocalStorageBackup(storage: LocalStorageLike, payload: LocalStorageBackupPayload): RestoreResult {
  const parsed = parseLocalStorageBackupJson(JSON.stringify(payload));
  if (!parsed.ok) {
    return { ok: false, restoredKeys: [], skippedKeys: parsed.skippedKeys, message: parsed.message };
  }

  parsed.restoreKeys.forEach((key) => {
    storage.setItem(key, parsed.payload.entries[key]);
  });

  return {
    ok: true,
    restoredKeys: parsed.restoreKeys,
    skippedKeys: parsed.skippedKeys,
    message: `${parsed.restoreKeys.length} 件のlocalStorageキーを復元しました。ページを再読み込みしてください。`,
  };
}

export function restoreLocalStorageBackupWithPreSnapshot(storage: LocalStorageLike, payload: LocalStorageBackupPayload, createdAt = new Date().toISOString()): RestoreWithPreSnapshotResult {
  const preRestoreSnapshot = createPreRestoreLocalStorageSnapshot(storage, createdAt);
  if (!preRestoreSnapshot.ok) {
    return {
      ok: false,
      restoredKeys: [],
      skippedKeys: [],
      message: `${preRestoreSnapshot.message} データ保護のため復元を中止しました。`,
      preRestoreSnapshot,
    };
  }

  try {
    const result = restoreLocalStorageBackup(storage, payload);
    return {
      ...result,
      message: result.ok
        ? `${result.message} 復元前の状態は ${preRestoreSnapshot.key} とダウンロードJSONに退避済みです。`
        : `${result.message} 復元前の状態は ${preRestoreSnapshot.key} に退避済みです。`,
      preRestoreSnapshot,
    };
  } catch {
    return {
      ok: false,
      restoredKeys: [],
      skippedKeys: [],
      message: `復元前の状態は ${preRestoreSnapshot.key} に退避済みですが、復元に失敗しました。localStorageの空き容量やブラウザ設定を確認してください。`,
      preRestoreSnapshot,
    };
  }
}
