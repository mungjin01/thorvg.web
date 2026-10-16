import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type { Video } from '../src/core/media/Video';
import type { Canvas } from '../src/core/Canvas';
import { getTVG } from './helpers';
// 1s of ffmpeg testsrc at 64x48 and 10fps (VP8) with a 440Hz Opus track
import videoUrl from './resources/video.webm?url';


const isHappyDom = () => globalThis.__TEST_ENV === 'happy-dom';

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  return new Uint8Array(await response.arrayBuffer());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// resolves with the playback time of the first frame play() draws
function playFirstFrame(video: Video): Promise<number> {
  return new Promise((resolve) => {
    video.play(resolve);
  });
}

// decoding needs WebCodecs and the audio clock needs Web Audio, which happy-dom does not provide
describe.skipIf(isHappyDom())('Video', () => {
  let canvas: Canvas;
  let video: Video;
  let bytes: Uint8Array;

  beforeAll(() => {
    const TVG = getTVG();
    canvas = new TVG.Canvas('#test-canvas', { width: 64, height: 48 });
  });

  afterAll(() => {
    canvas.destroy();
  });

  beforeEach(async () => {
    const TVG = getTVG();
    video = new TVG.Video();
    canvas.add(video);
    bytes = await fetchBytes(videoUrl);
  });

  afterEach(() => {
    canvas.remove(video);
    video.dispose();
  });

  it('load resolves with the duration and size of the media', async () => {
    await video.load(bytes);
    expect(video.duration()).toBeCloseTo(1, 1);
    expect(video.picture!.size()).toEqual({ width: 64, height: 48 });
  });

  it('play advances time as frames are drawn', async () => {
    await video.load(bytes);
    video.play();
    await expect.poll(() => video.time(), { timeout: 5000 }).toBeGreaterThan(0.3);
  });

  it('pause holds the position and play resumes from it', async () => {
    await video.load(bytes);
    video.play();
    await expect.poll(() => video.time(), { timeout: 5000 }).toBeGreaterThan(0.2);

    video.pause();
    const paused = video.time();
    await sleep(300);
    expect(video.time()).toBe(paused);

    const resumed = await playFirstFrame(video);
    expect(resumed).toBeGreaterThanOrEqual(paused);
    expect(resumed).toBeLessThan(paused + 0.25); // the 300ms spent paused is not skipped
  });

  it('seek moves playback to the new position', async () => {
    await video.load(bytes);
    video.seek(0.6);
    expect(await playFirstFrame(video)).toBeGreaterThanOrEqual(0.6);
  });

  it('stop rewinds to the start', async () => {
    await video.load(bytes);
    video.play();
    await expect.poll(() => video.time(), { timeout: 5000 }).toBeGreaterThan(0.3);

    video.stop();
    expect(await playFirstFrame(video)).toBeLessThan(0.3);
  });

  it('playback stays at the end without loop', async () => {
    await video.load(bytes);
    video.play();
    await expect.poll(() => video.time(), { timeout: 5000 }).toBeGreaterThan(0.8);

    await sleep(500); // past the end, where a looping video would be back near the start
    expect(video.time()).toBeGreaterThan(0.8);
  });

  it('loop restarts playback from the start', async () => {
    await video.loop(true).load(bytes);
    const times: number[] = [];
    video.play((time) => times.push(time));
    await expect.poll(() => times.some((time, i) => i > 0 && time < times[i - 1]!), { timeout: 5000 }).toBe(true);
  });

  it('load rejects data that is not a video', async () => {
    await expect(video.load(new Uint8Array([1, 2, 3]))).rejects.toThrow('Video decode failed');
  });

  it('dispose rejects a pending load', async () => {
    const TVG = getTVG();
    const pending = new TVG.Video();
    const loading = pending.load(bytes);
    pending.dispose();
    await expect(loading).rejects.toThrow('Video disposed');
  });
});
