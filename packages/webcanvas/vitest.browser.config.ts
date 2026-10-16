import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { playwright } from '@vitest/browser-playwright';
import path from 'path';

const renderer = (process.env.TEST_RENDERER || 'wg') as 'wg' | 'gl' | 'sw';

const gpuArgs =
  renderer === 'wg' ? ['--enable-unsafe-webgpu', '--enable-features=Vulkan'] :
  renderer === 'gl' ? ['--ignore-gpu-blocklist', '--use-gl=angle'] :
  []; // sw: no GPU flags required

// video playback starts its audio clock without a user gesture
const launchArgs = ['--autoplay-policy=no-user-gesture-required', ...gpuArgs];

// resolves `web-worker:` imports to Vite's own worker bundling, so the browser tests run the real worker
function webWorker(): Plugin {
  const PREFIX = 'web-worker:';
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

export default defineConfig({
  plugins: [webWorker()],
  define: {
    __TEST_RENDERER: JSON.stringify(renderer),
  },
  // the video worker imports it at runtime, so pre-bundle it up front instead of reloading mid-run
  optimizeDeps: {
    include: ['mediabunny'],
  },
  test: {
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: { args: launchArgs },
      }),
      instances: [{ browser: 'chromium' }],
      headless: true,
    },
    globals: true,
    root: '.',
    include: ['test/*.test.ts'],
    setupFiles: ['./test/setup.browser.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '../dist/thorvg': path.resolve(__dirname, 'dist/thorvg.js'),
    },
  },
});
