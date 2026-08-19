import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';

const EXPORT_FPS = 60;
const EXPORT_SCALE = 2;

/**
 * Local recordings API + Chrome/ffmpeg export. Dev and preview only.
 * Video stays in recordings/ and is never part of the Vite graph.
 */
export function recordingsPlugin(root) {
  const recordingsDir = resolve(root, 'recordings');
  const scenesDir = resolve(root, 'src/scenes');
  let busy = false;
  let exportStatus = idleExportStatus();

  const attach = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (!url.pathname.startsWith('/api/')) return next();

      try {
        await mkdir(recordingsDir, { recursive: true });

        if (req.method === 'GET' && url.pathname === '/api/scenes') {
          return sendJson(res, await listScenes(scenesDir));
        }

        if (req.method === 'GET' && url.pathname === '/api/recordings') {
          return sendJson(res, await listRecordings(recordingsDir));
        }

        if (req.method === 'GET' && url.pathname === '/api/export/status') {
          return sendJson(res, exportStatus);
        }

        if (req.method === 'POST' && url.pathname === '/api/export') {
          if (busy) return sendError(res, 409, 'An export is already running');
          const body = JSON.parse(String(await readBody(req)) || '{}');
          const scene = String(body.scene ?? '');
          const format = body.format === 'mov' ? 'mov' : 'mp4';
          if (!/^[A-Za-z0-9-]+$/.test(scene) || scene.startsWith('_')) {
            return sendError(res, 400, 'Unknown scene');
          }
          const sceneFile = join(scenesDir, scene, 'index.html');
          try {
            await stat(sceneFile);
          } catch {
            return sendError(res, 404, `Scene not found: ${scene}`);
          }

          req.setTimeout(0);
          res.setTimeout(0);
          busy = true;
          exportStatus = {
            ...idleExportStatus(),
            phase: 'queued',
            label: `Exporting ${format.toUpperCase()}`,
          };
          const signal = abortSignal(req, res);
          try {
            const port = serverPort(server);
            const file = await exportScene({
              scene,
              format,
              recordingsDir,
              scenesDir,
              url: `http://localhost:${port}/scenes/${scene}/index.html?export=1`,
              signal,
              onProgress: (progress) => {
                exportStatus = { ...exportStatus, ...progress };
              },
            });
            exportStatus = {
              phase: 'done',
              percent: 100,
              frame: 0,
              frames: 0,
              label: 'Done',
              name: file.name,
            };
            return sendJson(res, file);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Export failed';
            exportStatus = {
              ...idleExportStatus(),
              phase: 'error',
              error: message,
              label: message,
            };
            throw error;
          } finally {
            busy = false;
          }
        }

        const clip = url.pathname.match(/^\/api\/recordings\/([^/]+)$/);
        if (clip) {
          const name = decodeURIComponent(clip[1]);
          if (!/^[A-Za-z0-9._-]+\.(mp4|mov|webm)$/.test(name)) {
            return sendError(res, 400, 'Invalid recording name');
          }
          const file = join(recordingsDir, name);

          if (req.method === 'GET') {
            const info = await stat(file);
            res.statusCode = 200;
            res.setHeader('Content-Type', contentType(name));
            res.setHeader('Content-Length', String(info.size));
            if (url.searchParams.get('download') === '1') {
              res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
            }
            const { createReadStream } = await import('node:fs');
            createReadStream(file).pipe(res);
            return;
          }

          if (req.method === 'PUT') {
            await pipeline(req, createWriteStream(file));
            await writeIndex(recordingsDir);
            return sendJson(res, { name });
          }

          if (req.method === 'DELETE') {
            await unlink(file);
            await writeIndex(recordingsDir);
            res.statusCode = 204;
            res.end();
            return;
          }
        }

        return sendError(res, 404, 'Not found');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Server error';
        sendError(res, 500, message);
      }
    });
  };

  return {
    name: 'edgaze-recordings',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

function serverPort(server) {
  const address = server.httpServer?.address();
  if (address && typeof address === 'object') return address.port;
  return 5173;
}

async function listScenes(scenesDir) {
  const entries = await readdir(scenesDir, { withFileTypes: true });
  const scenes = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const source = await readFile(join(scenesDir, entry.name, 'scene.ts'), 'utf8');
    scenes.push(parseSceneSource(entry.name, source));
  }
  return scenes.sort((a, b) => a.id.localeCompare(b.id));
}

async function listRecordings(recordingsDir) {
  const names = (await readdir(recordingsDir)).filter((name) => /\.(mp4|mov|webm)$/.test(name));
  const clips = await Promise.all(
    names.map(async (name) => {
      const info = await stat(join(recordingsDir, name));
      return {
        name,
        bytes: info.size,
        mtime: info.mtime.toISOString(),
        scene: name.replace(/-\d{8}-\d{6}\.(mp4|mov|webm)$/, ''),
      };
    }),
  );
  return clips.sort((a, b) => b.mtime.localeCompare(a.mtime));
}

async function writeIndex(recordingsDir) {
  const clips = await listRecordings(recordingsDir);
  const rows = clips.length
    ? clips
        .map((clip) => {
          const date = clip.mtime.slice(0, 16).replace('T', ' ');
          return `| ${clip.name} | ${clip.scene} | ${date} | ${clip.bytes} |`;
        })
        .join('\n')
    : '| — | — | — | — |';
  const md = `# Recordings

Clips live on this machine only. Do not commit video.

| File | Scene | Date | Bytes |
| --- | --- | --- | --- |
${rows}
`;
  await writeFile(join(recordingsDir, 'INDEX.md'), md);
}

function parseSceneSource(id, source) {
  const named = source.match(/const DURATION\s*=\s*(\d+)/);
  const mount = source.match(/mountStage\(\s*\{[\s\S]*?\bduration:\s*(\d+|DURATION)/);
  const duration = Number(named?.[1] ?? (mount?.[1] && mount[1] !== 'DURATION' ? mount[1] : 0));
  const width = Number(source.match(/width:\s*(\d+)/)?.[1] ?? 1920);
  const height = Number(source.match(/height:\s*(\d+)/)?.[1] ?? 1080);
  const [number, ...rest] = id.split('-');
  return {
    id,
    number: number ?? id,
    title: rest.join(' ').replace(/-/g, ' '),
    width,
    height,
    duration,
  };
}

function idleExportStatus() {
  return {
    phase: 'idle',
    percent: 0,
    frame: 0,
    frames: 0,
    label: '',
    name: '',
    error: '',
  };
}

function abortSignal(req, res) {
  const controller = new AbortController();
  const cancel = () => {
    if (!res.writableEnded) controller.abort();
  };
  req.on('close', cancel);
  req.on('aborted', cancel);
  return controller.signal;
}

async function exportScene({
  scene,
  format,
  recordingsDir,
  url,
  scenesDir,
  onProgress,
  signal,
}) {
  const report = (progress) => {
    if (signal?.aborted) throw new Error('Export cancelled');
    onProgress?.(progress);
  };

  const { chromium } = await import('playwright');
  const stamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace('T', '-');
  const name = `${scene}-${stamp}.${format}`;
  const source = await readFile(join(scenesDir, scene, 'scene.ts'), 'utf8');
  const meta = parseSceneSource(scene, source);
  const width = meta.width || 1920;
  const height = meta.height || 1080;
  const duration = meta.duration || 10_000;
  const dest = join(recordingsDir, name);

  report({ phase: 'arm', percent: 1, label: 'Opening scene' });
  const browser = await launchChrome(chromium);
  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: EXPORT_SCALE,
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);
    await page.addInitScript(() => {
      Location.prototype.reload = function reload() {};
    });
    await page.route('**/@vite/client**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: VITE_CLIENT_STUB,
      }),
    );
    const live = await armPage(page, url);
    const ms = live?.duration || duration;

    const stage = page.locator('.stage');
    const frames = Math.max(1, Math.round((ms / 1000) * EXPORT_FPS));
    const outWidth = width * EXPORT_SCALE;
    const outHeight = height * EXPORT_SCALE;
    report({ phase: 'capture', percent: 2, frame: 0, frames, label: 'Capturing' });
    const encode = startEncode(dest, format);
    try {
      for (let i = 0; i < frames; i += 1) {
        const time = (i * 1000) / EXPORT_FPS;
        const frame = await grabFrame({
          page,
          stage,
          time,
          url,
          width,
          height,
          outWidth,
          outHeight,
        });
        await writeFrame(encode.child, frame);
        report({
          phase: 'capture',
          percent: 2 + Math.round(((i + 1) / frames) * 92),
          frame: i + 1,
          frames,
          label: 'Capturing',
        });
      }
      report({ phase: 'encode', percent: 96, frame: frames, frames, label: 'Encoding' });
      encode.child.stdin.end();
      await encode.done;
    } catch (error) {
      encode.child.kill();
      await unlink(dest).catch(() => undefined);
      throw error;
    }
    await context.close();
  } finally {
    await browser.close();
  }

  report({ phase: 'save', percent: 99, label: 'Saving' });
  await writeIndex(recordingsDir);
  const info = await stat(dest);
  report({ phase: 'done', percent: 100, name, label: 'Done' });
  return { name, bytes: info.size };
}

async function launchChrome(chromium) {
  try {
    return await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--hide-scrollbars',
        '--force-color-profile=srgb',
      ],
    });
  } catch {
    throw new Error('Google Chrome is required to export clips');
  }
}

const VITE_CLIENT_STUB = `
const hot = {
  data: {},
  accept() {},
  acceptExports() {},
  decline() {},
  dispose() {},
  prune() {},
  invalidate() {},
  on() {},
  off() {},
  send() {},
};
export const createHotContext = () => hot;
export const injectQuery = (url) => url;
export const updateStyle = () => {};
export const removeStyle = () => {};
`;

async function armPage(page, url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      if (!/interrupted|destroyed|closed/i.test(String(error))) throw error;
    }
  }
  if (lastError) throw lastError;
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => Boolean(window.__edgazeArm), { timeout: 15_000 });
  const live = await page.evaluate(() => window.__edgazeExport);
  await page.evaluate(() => window.__edgazeArm?.());
  return live;
}

async function grabFrame({ page, stage, time, url, width, height, outWidth, outHeight }) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await seekPage(page, time);
      return await captureFrame(page, stage, width, height, outWidth, outHeight);
    } catch (error) {
      lastError = error;
      if (isContextLost(error)) {
        await armPage(page, url);
        continue;
      }
      if (attempt === 2) throw error;
      await wait(40);
    }
  }
  throw lastError;
}

async function seekPage(page, time) {
  await page.evaluate((ms) => {
    window.__edgazeSeek?.(ms);
    document.body.getBoundingClientRect();
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }, time);
}

function isContextLost(error) {
  return /context was destroyed|Target closed|has been closed/i.test(String(error));
}

async function captureFrame(page, stage, width, height, outWidth, outHeight) {
  const shot = {
    type: 'jpeg',
    quality: 94,
    scale: 'device',
    caret: 'hide',
    animations: 'allow',
  };
  const frame = await stage.screenshot(shot);
  const size = imageSize(frame);
  if (size.width === outWidth && size.height === outHeight) return frame;
  const clipped = await page.screenshot({ ...shot, clip: { x: 0, y: 0, width, height } });
  assertCaptureSize(clipped, outWidth, outHeight);
  return clipped;
}

function assertCaptureSize(frame, width, height) {
  const size = imageSize(frame);
  if (size.width !== width || size.height !== height) {
    throw new Error(
      `Export captured ${size.width}×${size.height}, expected ${width}×${height}`,
    );
  }
}

function imageSize(buf) {
  if (buf.length >= 24 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length - 8) {
      if (buf[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buf[offset + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      const length = buf.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
  }
  throw new Error('Chrome did not return a still frame');
}

/**
 * Why: 4K 60 has ~10× the samples of the old 1080p ~25fps capture. CRF plus a
 * VBV cap keeps the file near the old size; dark UI compresses well under it.
 */
function startEncode(output, format) {
  const args = [
    '-y',
    '-f',
    'image2pipe',
    '-framerate',
    String(EXPORT_FPS),
    '-c:v',
    'mjpeg',
    '-i',
    'pipe:0',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-threads',
    '0',
    '-profile:v',
    'high',
    '-level',
    '5.2',
    '-crf',
    '22',
    '-maxrate',
    '8M',
    '-bufsize',
    '16M',
    '-vf',
    'scale=in_range=jpeg:out_range=mpeg,format=yuv420p',
    '-color_range',
    'tv',
    '-r',
    String(EXPORT_FPS),
    '-g',
    String(EXPORT_FPS),
    '-x264-params',
    'aq-mode=3',
    '-an',
  ];
  if (format === 'mp4') args.push('-movflags', '+faststart');
  args.push(output);

  const child = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const done = new Promise((resolve, reject) => {
    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('ffmpeg is required to export MP4 / MOV'));
        return;
      }
      reject(error);
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || 'ffmpeg failed'));
    });
  });
  return { child, done };
}

function writeFrame(child, chunk) {
  return new Promise((resolve, reject) => {
    if (child.stdin.destroyed) {
      reject(new Error('ffmpeg closed before the clip finished'));
      return;
    }
    const onError = (error) => {
      child.stdin.off('drain', onDrain);
      reject(error);
    };
    const onDrain = () => {
      child.stdin.off('error', onError);
      resolve();
    };
    child.stdin.once('error', onError);
    if (child.stdin.write(chunk)) {
      child.stdin.off('error', onError);
      resolve();
    } else {
      child.stdin.once('drain', onDrain);
    }
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendJson(res, data) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function sendError(res, status, error) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error }));
}

function contentType(name) {
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.webm')) return 'video/webm';
  return 'video/mp4';
}
