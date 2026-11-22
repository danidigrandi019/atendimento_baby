const DB_NAME = 'vitrine-atendimentos';
let database;
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
      const photos = db.createObjectStore('photos', { keyPath: 'id' });
      photos.createIndex('clientId', 'clientId');
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Feche as outras abas deste site e tente novamente.'));
    request.onsuccess = () => {
      database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}
function transaction(stores, mode, work) {
  return new Promise((resolve, reject) => {
    const tx = database.transaction(stores, mode);
    let result;
    let failure;
    tx.oncomplete = () => resolve(result);
    tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('Não foi possível salvar.'));
    work(tx, value => { result = value; }, error => { failure = error; tx.abort(); });
  });
}
export function listClients() {
  return transaction(['clients'], 'readonly', (tx, done) => {
    tx.objectStore('clients').getAll().onsuccess = e => done(e.target.result);
  });
}
export function listPhotos(clientId) {
  return transaction(['photos'], 'readonly', (tx, done) => {
    tx.objectStore('photos').index('clientId').getAll(clientId).onsuccess = e => done(e.target.result.sort((a,b) => a.createdAt-b.createdAt));
  });
}
export function createClient() {
  return transaction(['clients'], 'readwrite', (tx, done) => {
    const client = { createdAt: Date.now(), status: 'active', count: 0, cover: null };
    tx.objectStore('clients').add(client).onsuccess = e => done({ ...client, id: e.target.result });
  });
}
export function setClientStatus(id, status) {
  return transaction(['clients'], 'readwrite', (tx, done, fail) => {
    const clients = tx.objectStore('clients');
    clients.get(id).onsuccess = e => {
      if (!e.target.result) return fail(new Error('Este atendimento não está mais disponível.'));
      const client = { ...e.target.result, status, finishedAt: status === 'finished' ? Date.now() : null };
      clients.put(client);
      done(client);
    };
  });
}
export function addPhotos(clientId, prepared) {
  return transaction(['clients', 'photos'], 'readwrite', (tx, done, fail) => {
    const clients = tx.objectStore('clients');
    const photos = tx.objectStore('photos');
    clients.get(clientId).onsuccess = e => {
      const client = e.target.result;
      if (!client || client.status !== 'active') return fail(new Error('Reabra o atendimento antes de salvar as fotos.'));
      const start = Date.now();
      prepared.forEach((photo, i) => photos.add({ ...photo, id: crypto.randomUUID(), clientId, createdAt: start + i }));
      clients.put({ ...client, count: client.count + prepared.length, cover: client.cover || prepared[0]?.thumb || null });
      done(prepared.length);
    };
  });
}
export function deletePhoto(photoId, clientId) {
  return transaction(['clients', 'photos'], 'readwrite', (tx, done, fail) => {
    const clients = tx.objectStore('clients');
    const photos = tx.objectStore('photos');
    photos.get(photoId).onsuccess = e => {
      if (!e.target.result || e.target.result.clientId !== clientId) return fail(new Error('Foto não encontrada neste cliente.'));
      photos.delete(photoId);
      clients.get(clientId).onsuccess = e => {
        const client = e.target.result;
        if (!client) return fail(new Error('Cliente não encontrado.'));
        photos.index('clientId').getAll(clientId).onsuccess = e => {
          const remaining = e.target.result.sort((a,b) => a.createdAt-b.createdAt);
          clients.put({ ...client, count: remaining.length, cover: remaining[0]?.thumb || null });
          done(true);
        };
      };
    };
  });
}
export function deleteClient(clientId) {
  return transaction(['clients', 'photos'], 'readwrite', (tx, done) => {
    const photos = tx.objectStore('photos');
    photos.index('clientId').openKeyCursor(IDBKeyRange.only(clientId)).onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) { photos.delete(cursor.primaryKey); cursor.continue(); }
    };
    tx.objectStore('clients').delete(clientId);
    done(true);
  });
}
