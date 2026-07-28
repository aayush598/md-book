"use client";

const DB_NAME = "ebook-content";
const DB_VERSION = 1;
const STORE_NAME = "chapters";

interface ContentRecord {
  id: string;
  content: string;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveContent(
  projectId: string,
  chapterId: string,
  content: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      id: `${projectId}:${chapterId}`,
      content,
      updatedAt: Date.now(),
    } satisfies ContentRecord);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getContent(
  projectId: string,
  chapterId: string
): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(`${projectId}:${chapterId}`);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as ContentRecord)?.content ?? "");
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function saveBatchContent(
  projectId: string,
  entries: { id: string; content: string }[]
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const now = Date.now();
    for (const e of entries) {
      store.put({ id: `${projectId}:${e.id}`, content: e.content, updatedAt: now } satisfies ContentRecord);
    }
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadAllContent(
  projectId: string,
  chapterIds: string[]
): Promise<Map<string, string>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const result = new Map<string, string>();

    let pending = chapterIds.length;
    if (pending === 0) {
      db.close();
      resolve(result);
      return;
    }

    for (const id of chapterIds) {
      const req = store.get(`${projectId}:${id}`);
      req.onsuccess = () => {
        if (req.result) result.set(id, (req.result as ContentRecord).content);
        pending--;
        if (pending === 0) {
          db.close();
          resolve(result);
        }
      };
      req.onerror = () => {
        pending--;
        if (pending === 0) {
          db.close();
          resolve(result);
        }
      };
    }
  });
}

export async function deleteProjectContent(projectId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        if ((cursor.key as string).startsWith(`${projectId}:`)) {
          store.delete(cursor.key);
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
