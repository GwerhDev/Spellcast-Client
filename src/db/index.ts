const DB_NAME = 'SpellcastDB';
const DB_VERSION = 2;
const DOCUMENTS_STORE_NAME = 'documents';
const DOCUMENT_PROGRESS_STORE_NAME = 'documentProgress';

interface Document {
  id: string;
  title: string;
  pdf: Blob;
  createdAt: Date;
}

interface DocumentProgress {
  documentId: string;
  currentPage: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DOCUMENTS_STORE_NAME)) {
        const store = db.createObjectStore(DOCUMENTS_STORE_NAME, { keyPath: 'id' });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(DOCUMENT_PROGRESS_STORE_NAME)) {
        db.createObjectStore(DOCUMENT_PROGRESS_STORE_NAME, { keyPath: 'documentId' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveDocumentToDB = async (document: Omit<Document, 'id' | 'createdAt'>): Promise<string> => {
  const db = await openDB();
  const transaction = db.transaction(DOCUMENTS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(DOCUMENTS_STORE_NAME);

  const newDocument: Document = {
    ...document,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };

  return new Promise((resolve, reject) => {
    const request = store.add(newDocument);
    request.onsuccess = () => resolve(newDocument.id);
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

export const getDocumentsFromDB = async (): Promise<Document[]> => {
  const db = await openDB();
  const transaction = db.transaction(DOCUMENTS_STORE_NAME, 'readonly');
  const store = transaction.objectStore(DOCUMENTS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result as Document[]);
    };
    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
};

export const getDocumentById = async (id: string): Promise<Document | undefined> => {
  const db = await openDB();
  const transaction = db.transaction(DOCUMENTS_STORE_NAME, 'readonly');
  const store = transaction.objectStore(DOCUMENTS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result as Document | undefined);
    };
    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
};

export const deleteDocumentFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(DOCUMENTS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(DOCUMENTS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
};

export const saveDocumentProgress = async (progress: DocumentProgress): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(DOCUMENT_PROGRESS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(DOCUMENT_PROGRESS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.put(progress);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

export const getDocumentProgress = async (documentId: string): Promise<DocumentProgress | undefined> => {
  const db = await openDB();
  const transaction = db.transaction(DOCUMENT_PROGRESS_STORE_NAME, 'readonly');
  const store = transaction.objectStore(DOCUMENT_PROGRESS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.get(documentId);
    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result as DocumentProgress | undefined);
    };
    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
};
