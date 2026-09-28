
import { OnboardingState } from '../types';

const DB_NAME = 'zemen-onboarding';
const STORE_NAME = 'sessions';
const DB_VERSION = 1;
const KEY_STORAGE_KEY = 'zemen-session-key';

interface EncryptedPayload {
  iv: string;
  ciphertext: string;
}

interface SavedSession {
  state: OnboardingState;
  savedAt: number;
}

// --- IndexedDB helpers ---

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Web Crypto AES-GCM helpers ---

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  if (stored) {
    const raw = fromBase64(stored);
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
  }
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await crypto.subtle.exportKey('raw', key);
  localStorage.setItem(KEY_STORAGE_KEY, toBase64(exported));
  return key;
}

async function encrypt(plaintext: string): Promise<EncryptedPayload> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    iv: toBase64(iv.buffer),
    ciphertext: toBase64(cipherBuffer),
  };
}

async function decrypt(payload: EncryptedPayload): Promise<string> {
  const key = await getOrCreateKey();
  const iv = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.ciphertext);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// --- Public API ---

export async function saveSession(state: OnboardingState): Promise<void> {
  try {
    const session: SavedSession = { state, savedAt: Date.now() };
    const json = JSON.stringify(session);
    const encrypted = await encrypt(json);
    const db = await openDB();
    await idbPut(db, 'current', encrypted);
    db.close();
  } catch {
    // Best-effort — silently fail if storage is unavailable
  }
}

export async function loadSession(): Promise<SavedSession | null> {
  try {
    const db = await openDB();
    const encrypted: EncryptedPayload | undefined = await idbGet(db, 'current');
    db.close();
    if (!encrypted) return null;
    const json = await decrypt(encrypted);
    return JSON.parse(json) as SavedSession;
  } catch {
    // Corrupted or key mismatch — treat as no session
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    const db = await openDB();
    await idbDelete(db, 'current');
    db.close();
    localStorage.removeItem(KEY_STORAGE_KEY);
  } catch {
    // Best-effort cleanup
  }
}
