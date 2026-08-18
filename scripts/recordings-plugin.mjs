import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';

/**
 * Local recordings API + Chrome/ffmpeg export. Dev and preview only.
 * Video stays in recordings/ and is never part of the Vite graph.
 */
export function recordingsPlugin(root) {
  const recordingsDir = resolve(root, 'recordings');
  const scenesDir = resolve(root, 'src/scenes');
  let busy = false;

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

          busy = true;
          try {
            const port = serverPort(server);
            const file = await exportScene({
              scene,
              format,
              recordingsDir,
              url: `http://localhost:${port}/scenes/${scene}/index.html?export=1`,
            });
            return sendJson(res, file);
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

async function exportScene({ scene, format, recordingsDir, url }) {
  const { chromium } = await import('playwright');
  const stamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace('T', '-');
  const name = `${scene}-${stamp}.${format}`;
  const tmp = join(tmpdir(), `edgaze-${stamp}`);
  await mkdir(tmp, { recursive: true });

  const browser = await launchChrome(chromium);
  let webm = '';
  let preroll = 0;
  let duration = 10_000;
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
      recordVideo: { dir: tmp, size: { width: 1920, height: 1080 } },
    });
    const page = await context.newPage();
    const gotoAt = Date.now();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => Boolean(window.__edgazeStart), { timeout: 15_000 });
    const meta = await page.evaluate(() => window.__edgazeExport);
    if (meta?.duration) duration = meta.duration;
    preroll = (Date.now() - gotoAt) / 1000;
    await page.evaluate(() => window.__edgazeStart?.());
    await page.waitForFunction(() => Boolean(window.__edgazeDone), {
      timeout: duration + 8_000,
    });
    await new Promise((resolve) => setTimeout(resolve, 320));
    await page.close();
    const video = page.video();
    if (!video) throw new Error('Chrome did not produce a video');
    webm = await video.path();
    await context.close();
  } finally {
    await browser.close();
  }

  const dest = join(recordingsDir, name);
  await transcode(webm, dest, format, Math.max(0, preroll - 0.05));
  await writeIndex(recordingsDir);
  const info = await stat(dest);
  return { name, bytes: info.size };
}

async function launchChrome(chromium) {
  try {
    return await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--autoplay-policy=no-user-gesture-required'],
    });
  } catch {
    throw new Error('Google Chrome is required to export clips');
  }
}

async function transcode(input, output, format, ss) {
  const args = [
    '-y',
    '-ss',
    ss.toFixed(3),
    '-i',
    input,
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-an',
  ];
  if (format === 'mp4') args.push('-movflags', '+faststart');
  args.push(output);
  await run('ffmpeg', args);
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('ffmpeg is required to export MP4 / MOV'));
        return;
      }
      reject(error);
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `${cmd} failed`));
    });
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
