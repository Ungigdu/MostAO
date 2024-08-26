export {}

// IndexedDB 数据库的名称和版本
const DB_NAME = 'rsaKeyDB';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

// 打开 IndexedDB 数据库
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
}

// 存储密钥对到 IndexedDB
export async function storeKeys(publicKey: string, privateKey: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.put({ id: 'publicKey', value: publicKey });
    store.put({ id: 'privateKey', value: privateKey });

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      reject((event.target as IDBTransaction).error);
    };
  });
}

// 从 IndexedDB 中读取密钥对
export async function getKeys(): Promise<{ publicKey: string; privateKey: string } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const publicKeyRequest = store.get('publicKey');
    const privateKeyRequest = store.get('privateKey');

    transaction.oncomplete = () => {
      if (publicKeyRequest.result && privateKeyRequest.result) {
        resolve({
          publicKey: publicKeyRequest.result.value,
          privateKey: privateKeyRequest.result.value,
        });
      } else {
        resolve(null);
      }
    };

    transaction.onerror = (event) => {
      reject((event.target as IDBTransaction).error);
    };
  });
}

// 删除 IndexedDB 数据库
export function deleteDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => {
      console.log('Database deleted successfully');
      resolve();
    };

    request.onerror = (event) => {
      console.error('Error deleting database:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };

    request.onblocked = () => {
      console.warn('Database deletion blocked');
      reject(new Error('Database deletion blocked'));
    };
  });
}

// 删除指定键的条目（如公钥和私钥）
export async function removeKeys(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // 删除公钥和私钥
    store.delete('publicKey');
    store.delete('privateKey');

    transaction.oncomplete = () => {
      console.log('PublicKey and PrivateKey removed successfully');
      resolve();
    };

    transaction.onerror = (event) => {
      console.error('Error removing keys:', (event.target as IDBTransaction).error);
      reject((event.target as IDBTransaction).error);
    };
  });
}