import { Injectable } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { PlatformApiService } from '../api/platform-api.service';

export interface QueuedImage {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  base64Data: string;
  addedAt: Date;
  status: 'pending' | 'uploading' | 'done' | 'error';
  userCorreo?: string;
}

const DB_NAME    = 'incendios-offline';
const DB_VERSION = 1;
const STORE_NAME = 'image-queue';

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private db: IDBDatabase | null = null;
  isOnline = navigator.onLine;

  constructor(private platformApi: PlatformApiService) {
    this.initDB();
    window.addEventListener('online',  () => { this.isOnline = true;  this.processQueue(); });
    window.addEventListener('offline', () => { this.isOnline = false; });
  }

  /* ── IndexedDB setup ── */
  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => { this.db = (e.target as IDBOpenDBRequest).result; resolve(); };
      req.onerror   = () => reject(req.error);
    });
  }

  /* ── Add image to queue ── */
  async enqueueImage(file: File, userCorreo?: string): Promise<QueuedImage> {
    const base64Data = await this.fileToBase64(file);
    const item: QueuedImage = {
      id:         crypto.randomUUID(),
      fileName:   file.name,
      fileSize:   file.size,
      fileType:   file.type,
      base64Data,
      addedAt:    new Date(),
      status:     'pending',
      userCorreo
    };

    await this.dbPut(item);

    if (this.isOnline) {
      // Try immediately if online
      this.processQueue();
    }
    return item;
  }

  /* ── Get all pending items ── */
  async getPendingItems(): Promise<QueuedImage[]> {
    const all = await this.dbGetAll();
    return all.filter(i => i.status === 'pending' || i.status === 'error');
  }

  /* ── Get all items (for display) ── */
  async getAllItems(): Promise<QueuedImage[]> {
    return this.dbGetAll();
  }

  /* ── Process queue when online ── */
  async processQueue(): Promise<void> {
    if (!this.isOnline) return;
    const pending = await this.getPendingItems();
    for (const item of pending) {
      await this.uploadItem(item);
    }
  }

  private async uploadItem(item: QueuedImage): Promise<void> {
    item.status = 'uploading';
    await this.dbPut(item);

    try {
      const file = this.base64ToFile(item.base64Data, item.fileName, item.fileType);
      await firstValueFrom(this.platformApi.uploadImage(file));

      item.status = 'done';
      await this.dbPut(item);
    } catch {
      item.status = 'error';
      await this.dbPut(item);
    }
  }

  /* ── Delete item ── */
  async deleteItem(id: string): Promise<void> {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const tx    = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  /* ── Clear completed items ── */
  async clearDone(): Promise<void> {
    const all = await this.dbGetAll();
    for (const item of all.filter(i => i.status === 'done')) {
      await this.deleteItem(item.id);
    }
  }

  /* ── File → base64 ── */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private base64ToFile(dataUrl: string, fileName: string, fileType: string): File {
    const [metadata, base64Data] = dataUrl.split(',');
    const mimeType = metadata.match(/data:(.*);base64/)?.[1] || fileType || 'application/octet-stream';
    const binary = atob(base64Data || '');
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new File([bytes], fileName, { type: mimeType });
  }

  /* ── IDB helpers ── */
  async dbPut(item: QueuedImage): Promise<void> {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const tx    = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  private async dbGetAll(): Promise<QueuedImage[]> {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const tx    = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.getAll();
      req.onsuccess = () => resolve(req.result as QueuedImage[]);
      req.onerror   = () => reject(req.error);
    });
  }
}
