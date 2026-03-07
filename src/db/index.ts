const DB_NAME = 'SpellcastDB';
const DB_VERSION = 5; // Incremented version to trigger onupgradeneeded
const DOCUMENTS_STORE_NAME = 'documents';
const DOCUMENT_PROGRESS_STORE_NAME = 'documentProgress'; // Keep for migration

interface Document {
  id: string;
  title: string;
  pdf: Blob;
  createdAt: Date;
  userId: string | undefined;
  progress?: DocumentProgress;
}

interface DocumentProgress {
  currentPage: number;
  pagesProgress: number[];
  lastReadSentenceIndex: number;
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
        store.createIndex('userId', 'userId', { unique: false });
      }
      // Remove the old progress store if it exists
      if (db.objectStoreNames.contains(DOCUMENT_PROGRESS_STORE_NAME)) {
        db.deleteObjectStore(DOCUMENT_PROGRESS_STORE_NAME);
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

export const saveDocumentToDB = async (document: Omit<Document, 'id' | 'createdAt' | 'progress'>): Promise<string> => {
  const db = await openDB();
  const transaction = db.transaction(DOCUMENTS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(DOCUMENTS_STORE_NAME);

  const newDocument: Document = {
    ...document,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    progress: {
      currentPage: 0,
      pagesProgress: [],
      lastReadSentenceIndex: 0,
    }
  };

  return new Promise((resolve, reject) => {
    const request = store.add(newDocument);
    request.onsuccess = () => resolve(newDocument.id);
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

export const getDocumentsFromDB = async (userId: string | undefined): Promise<Document[]> => {
  const db = await openDB();
  const transaction = db.transaction(DOCUMENTS_STORE_NAME, 'readonly');
  const docStore = transaction.objectStore(DOCUMENTS_STORE_NAME);
  const docIndex = docStore.index('userId');

  return new Promise((resolve, reject) => {
    const getAllRequest = docIndex.getAll(userId);

    getAllRequest.onerror = () => {
      reject(getAllRequest.error);
    };

    getAllRequest.onsuccess = () => {
      resolve(getAllRequest.result);
    };
  });
};

export const getDocumentById = async (id: string, userId: string | undefined): Promise<Document | undefined> => {
  const db = await openDB();
  const transaction = db.transaction(DOCUMENTS_STORE_NAME, 'readonly');
  const docStore = transaction.objectStore(DOCUMENTS_STORE_NAME);

  return new Promise((resolve, reject) => {
    const docRequest = docStore.get(id);

    docRequest.onerror = () => {
      reject(docRequest.error);
    };

    docRequest.onsuccess = () => {
      const doc = docRequest.result as Document | undefined;
      if (!doc || doc.userId !== userId) {
        return resolve(undefined);
      }
      resolve(doc);
    };
  });
};

export const deleteDocumentFromDB = async (id: string, userId: string | undefined): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(DOCUMENTS_STORE_NAME, 'readwrite');
  const docStore = transaction.objectStore(DOCUMENTS_STORE_NAME);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    const getRequest = docStore.get(id);
    getRequest.onsuccess = () => {
      const doc = getRequest.result as Document | undefined;
      if (doc?.userId === userId) {
        docStore.delete(id);
      } else {
        transaction.abort();
        reject('Document not found or you do not have permission to delete it.');
      }
    };
  });
};

export const updateDocumentProgress = async (documentId: string, userId: string, progress: DocumentProgress): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(DOCUMENTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(DOCUMENTS_STORE_NAME);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(documentId);

        getRequest.onsuccess = () => {
            const document = getRequest.result as Document | undefined;
            if (document && document.userId === userId) {
                const updatedDocument = { ...document, progress };
                const putRequest = store.put(updatedDocument);

                putRequest.onsuccess = () => resolve();
                putRequest.onerror = (event) => reject((event.target as IDBRequest).error);
            } else {
                reject(new Error('Document not found or user mismatch.'));
            }
        };

        getRequest.onerror = (event) => reject((event.target as IDBRequest).error);
    });
};