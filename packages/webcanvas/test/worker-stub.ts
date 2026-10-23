import type { Plugin } from 'vite';

const PREFIX = 'web-worker:';

export function webWorkerStub(): Plugin {
  const STUB_ID = '\0web-worker-stub';
  return {
    name: 'web-worker-stub',
    enforce: 'pre',
    resolveId(id) {
      if (id.startsWith(PREFIX)) return STUB_ID;
    },
    load(id) {
      if (id === STUB_ID) {
        return `export default class {
          constructor() {
            this.messages = [];
            this.onmessage = null;
            this.terminated = false;
            (globalThis.__WORKERS ||= []).push(this);
          }
          postMessage(message) { this.messages.push(message); }
          terminate() { this.terminated = true; }
          addEventListener() {}
          removeEventListener() {}
        };`;
      }
    },
  };
}

// loads the real worker through Vite's ?worker import
export function webWorker(): Plugin {
  return {
    name: 'web-worker',
    enforce: 'pre',
    async resolveId(id, importer) {
      if (!id.startsWith(PREFIX)) return;
      const resolved = await this.resolve(id.slice(PREFIX.length), importer, { skipSelf: true });
      return resolved && `${resolved.id}?worker`;
    },
  };
}
