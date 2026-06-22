export const STOCK_TREND_LOCAL_STORAGE_PREFIX = "stock-trend-mvp:";
export const LOCAL_STORAGE_BACKUP_APP_ID = "stock-trend-mvp";
export const LOCAL_STORAGE_BACKUP_SCHEMA_VERSION = "local-storage-backup-v1";

export type LocalStorageLike = {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|apikey|authorization|bearer|token|secret|password|openai)/i;
const SENSITIVE_VALUE_PATTERN = /(sk-[A-Za-z0-9_-]{12,}|OPENAI_API_KEY|Bearer\s+[A-Za-z0-9._-]{12,}|AIza[0-9A-Za-z_-]{20,})/;

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

export function listStockTrendLocalStorageKeys(storage: LocalStorageLike): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(STOCK_TREND_LOCAL_STORAGE_PREFIX)) {
      keys.push(key);
    }
  }
  return keys.sort((a, b) => a.localeCompare(b));
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

export function createLocalStorageBackup(storage: LocalStorageLike, createdAt = new Date().toISOString()): BackupResult {
  const keys = listStockTrendLocalStorageKeys(storage);
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
