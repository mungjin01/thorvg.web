import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import { getTVG } from './helpers';
import type { Canvas } from '../src/core/Canvas';
import type { Video } from '../src/core/media/Video';


// clip.webm: 2s of 64x64 VP8 at 10fps with a 440Hz mono Opus track
// ffmpeg -f lavfi -i testsrc=size=64x64:rate=10:duration=2 -f lavfi -i sine=frequency=440:sample_rate=48000:duration=2
//        -c:v libvpx -b:v 50k -c:a libopus -b:a 32k -ac 1 -shortest clip.webm
const CLIP = new URL('./resources/clip.webm', import.meta.url);

const POLL = { timeout: 3000 };
const TO_END = { timeout: 5000 };

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// the time once it stops moving
async function stoppedAt(video: Video): Promise<number> {
  let time = Number.NaN;
  await expect.poll(async () => {
    time = video.time();
    await wait(300);
    return video.time() === time;
  }, TO_END).toBe(true);
  return time;
}

describe('Video', () => {
  let clip: ArrayBuffer;
  let canvas: Canvas;
  let video: Video;

  beforeAll(async () => {
    clip = await (await fetch(CLIP)).arrayBuffer();
    canvas = new (getTVG().Canvas)('#test-canvas', { width: 64, height: 64 });

    // audio starts only after a user gesture
    await userEvent.click(document.body);
  });

  afterAll(() => {
    canvas.destroy();
  });

  beforeEach(async () => {
    video = new (getTVG().Video)();
    canvas.add(video);
    await video.load(clip.slice(0)); // load transfers the buffer to the worker
  });

  afterEach(() => {
    canvas.remove(video);
    video.dispose();
  });

  it('load reports the duration of the clip', () => {
    expect(video.duration()).toBeCloseTo(2, 1);
  });

  it('time advances while playing', async () => {
    video.play();

    await expect.poll(() => video.time(), POLL).toBeGreaterThan(0.5);
  });

  it('pause holds the time', async () => {
    video.play();
    await expect.poll(() => video.time(), POLL).toBeGreaterThan(0.5);

    video.pause();
    const paused = video.time();
    await wait(500);

    expect(video.time()).toBe(paused);
  });

  it('play resumes from where it paused', async () => {
    video.play();
    await expect.poll(() => video.time(), POLL).toBeGreaterThan(0.5);
    video.pause();
    const paused = video.time();

    video.play();
    await expect.poll(() => video.time(), POLL).not.toBe(paused);

    expect(video.time()).toBeGreaterThan(paused); // not back to the start
  });

  it('seek moves playback to the new position', async () => {
    video.play();
    await expect.poll(() => video.time(), POLL).toBeGreaterThan(1.2);

    video.seek(0.2);

    // only the seek can move it back
    await expect.poll(() => video.time(), POLL).toBeLessThan(1);
    expect(video.time()).toBeGreaterThanOrEqual(0.2);
  });

  it('playback stops at the end', async () => {
    video.play();
    await expect.poll(() => video.time(), TO_END).toBeGreaterThan(video.duration() - 0.2);

    expect(await stoppedAt(video)).toBeGreaterThan(video.duration() - 0.2);
  });

  it('loop starts over at the end', async () => {
    video.loop(true).play();
    await expect.poll(() => video.time(), TO_END).toBeGreaterThan(1.5);

    await expect.poll(() => video.time(), TO_END).toBeLessThan(0.5);
  });

  it('muted playback still advances the time', async () => {
    video.mute(true).play();

    await expect.poll(() => video.time(), POLL).toBeGreaterThan(0.5);
  });
});
