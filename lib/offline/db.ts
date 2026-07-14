// Wrapper mínimo de IndexedDB (sem dependências). Usado só no browser.
const DB_NAME = "alianca-log";
const DB_VERSION = 1;
export const STORE_FILA = "fila_canhotos";
export const STORE_CACHE = "cache_notas";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FILA))
        db.createObjectStore(STORE_FILA, { keyPath: "client_id" });
      if (!db.objectStoreNames.contains(STORE_CACHE))
        db.createObjectStore(STORE_CACHE, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function idbPut<T>(store: string, value: T): Promise<IDBValidKey> {
  return tx(store, "readwrite", (s) => s.put(value as unknown as object));
}

export function idbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  return tx<T | undefined>(store, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
}

export function idbGetAll<T>(store: string): Promise<T[]> {
  return tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

export function idbDelete(store: string, key: IDBValidKey): Promise<undefined> {
  return tx(store, "readwrite", (s) => s.delete(key));
}

export function idbClear(store: string): Promise<undefined> {
  return tx(store, "readwrite", (s) => s.clear());
}
