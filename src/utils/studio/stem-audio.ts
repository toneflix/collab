import type { Stem } from 'src/utils/daw';

export interface AudioProgress {
  loaded: number;
  total: number;
  /** Read from this device instead of the network */
  cached: boolean;
}

type ProgressHandler = (progress: AudioProgress) => void;

/**
 * Keeps each stem's audio in the browser (Cache Storage), so a track opens
 * from this device after the first visit and only new or changed audio is
 * downloaded. Entries are keyed by stem id and file, so replacing a stem's
 * audio gives it a new entry and the old one is dropped.
 */
export class StemAudioStore {
  private static readonly CACHE = 'toneflix-stem-audio-v1';
  private static readonly PREFIX = '/__stem-audio/';
  /** Roughly how much audio to keep before the oldest stems are dropped */
  private static readonly MAX_BYTES = 1024 * 1024 * 1024;

  private opened?: Promise<Cache | null>;
  private inflight = new Map<string, { promise: Promise<Blob>; listeners: Set<ProgressHandler> }>();

  /** The stem's audio, from this device when it has it, otherwise downloaded and kept. */
  get(stem: Stem, onProgress?: ProgressHandler): Promise<Blob> {
    const key = this.address(stem);
    const running = this.inflight.get(key);
    if (running) {
      if (onProgress) running.listeners.add(onProgress);
      return running.promise;
    }

    const listeners = new Set<ProgressHandler>(onProgress ? [onProgress] : []);
    const report = (p: AudioProgress) => listeners.forEach((fn) => fn(p));
    const promise = this.read(stem, key, report).finally(() => this.inflight.delete(key));
    this.inflight.set(key, { promise, listeners });

    return promise;
  }

  /** Keep audio this device already has, like a file that was just uploaded. */
  async put(stem: Stem, audio: Blob) {
    const cache = await this.cache();
    if (!cache) return;

    try {
      await cache.put(
        this.address(stem),
        new Response(audio, {
          headers: {
            'Content-Type': audio.type || 'application/octet-stream',
            'X-Size': String(audio.size),
            'X-Stored-At': String(Date.now()),
          },
        }),
      );
      await this.dropOtherVersions(stem);
      await this.trim();
    } catch {
      // Out of space or storage blocked; the audio still plays from memory.
    }
  }

  /** Drop every version kept for a stem. */
  async forget(stemId: string | number) {
    const cache = await this.cache();
    if (!cache) return;

    const prefix = this.stemPrefix(stemId);
    for (const request of await cache.keys()) {
      if (new URL(request.url).pathname.startsWith(prefix)) await cache.delete(request);
    }
  }

  /** Drop all kept audio, e.g. when signing out. */
  async clear() {
    this.opened = undefined;
    if (typeof caches !== 'undefined') await caches.delete(StemAudioStore.CACHE).catch(() => false);
  }

  private async read(stem: Stem, key: string, report: ProgressHandler): Promise<Blob> {
    const cache = await this.cache();
    const hit = await cache?.match(key).catch(() => undefined);
    if (hit) {
      const blob = await hit.blob();
      report({ loaded: blob.size, total: blob.size, cached: true });
      return blob;
    }

    const blob = await this.download(stem, report);
    void this.put(stem, blob);

    return blob;
  }

  /** Download the audio, reporting bytes as they arrive. */
  private async download(stem: Stem, report: ProgressHandler): Promise<Blob> {
    const src = stem.meta?.src || stem.src;
    const response = await fetch(src);
    if (!response.ok) throw new Error(`The audio couldn't be downloaded (${response.status}).`);

    const total = Number(response.headers.get('Content-Length')) || stem.size || 0;
    const type = response.headers.get('Content-Type') || 'audio/mpeg';
    if (!response.body) {
      const blob = await response.blob();
      report({ loaded: blob.size, total: blob.size, cached: false });
      return blob;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    report({ loaded, total, cached: false });

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      report({ loaded, total: Math.max(total, loaded), cached: false });
    }

    return new Blob(chunks as BlobPart[], { type });
  }

  /** Remove older audio of the same stem once a newer file is kept. */
  private async dropOtherVersions(stem: Stem) {
    const cache = await this.cache();
    if (!cache) return;

    const current = new URL(this.address(stem)).pathname;
    const prefix = this.stemPrefix(stem.id);
    for (const request of await cache.keys()) {
      const path = new URL(request.url).pathname;
      if (path.startsWith(prefix) && path !== current) await cache.delete(request);
    }
  }

  /** Drop the oldest stems once the kept audio grows past MAX_BYTES. */
  private async trim() {
    const cache = await this.cache();
    if (!cache) return;

    const entries: { request: Request; size: number; at: number }[] = [];
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      entries.push({
        request,
        size: Number(response?.headers.get('X-Size')) || 0,
        at: Number(response?.headers.get('X-Stored-At')) || 0,
      });
    }

    let used = entries.reduce((sum, e) => sum + e.size, 0);
    for (const entry of entries.sort((a, b) => a.at - b.at)) {
      if (used <= StemAudioStore.MAX_BYTES) break;
      await cache.delete(entry.request);
      used -= entry.size;
    }
  }

  private cache(): Promise<Cache | null> {
    if (!this.opened) {
      this.opened =
        typeof caches === 'undefined'
          ? Promise.resolve(null)
          : caches.open(StemAudioStore.CACHE).catch(() => null);
    }

    return this.opened;
  }

  private stemPrefix(stemId: string | number) {
    return `${StemAudioStore.PREFIX}${encodeURIComponent(String(stemId))}/`;
  }

  /** A stem's file name changes whenever its audio does, so it versions the entry. */
  private address(stem: Stem) {
    const version = encodeURIComponent([stem.src, stem.size].filter(Boolean).join('-') || 'audio');
    return `${location.origin}${this.stemPrefix(stem.id)}${version}`;
  }
}

export const stemAudio = new StemAudioStore();
