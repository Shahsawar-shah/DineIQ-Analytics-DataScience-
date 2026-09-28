// Renders scenes.html frame-by-frame in headless Chrome and encodes each scene to an H.264 MP4
// in public/videos/ (plus a JPEG poster for the first scene).
//
// Requirements: Google Chrome, ffmpeg, and puppeteer-core (not a project dependency):
//   npm i --no-save puppeteer-core
//   node scripts/hero-videos/render.mjs                 # all scenes
//   node scripts/hero-videos/render.mjs --still 3       # PNG stills at t=3s for a quick look
// Env overrides: CHROME=/path/to/chrome FFMPEG=/path/to/ffmpeg PUPPETEER_FROM=/dir/with/node_modules/
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(process.env.PUPPETEER_FROM ? path.join(process.env.PUPPETEER_FROM, 'x.js') : import.meta.url)
const puppeteer = require('puppeteer-core')

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const OUT = path.resolve(here, '../../public/videos')
const SCENES = ['sales', 'menu', 'forecast', 'guests']
const FPS = 30
const DUR = 7

const stillAt = process.argv.includes('--still') ? Number(process.argv[process.argv.indexOf('--still') + 1]) : null
const only = process.argv.find((a) => SCENES.includes(a))

mkdirSync(OUT, { recursive: true })
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] })
const page = await browser.newPage()
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })

for (const scene of only ? [only] : SCENES) {
  const url = pathToFileURL(path.join(here, 'scenes.html')).href + `?scene=${scene}&dur=${DUR}`
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.evaluate(() => window.sceneReady)

  if (stillAt !== null) {
    await page.evaluate((t) => window.renderFrame(t), stillAt)
    await page.screenshot({ path: path.join(process.env.STILL_DIR || here, `still-${scene}.png`) })
    console.log('still', scene)
    continue
  }

  const file = path.join(OUT, `hero-${scene}.mp4`)
  const ff = spawn(FFMPEG, [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-color_range', 'tv',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-profile:v', 'high',
    '-movflags', '+faststart', '-an', file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] })

  const total = FPS * DUR
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.renderFrame(t), f / FPS)
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 })
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
    if (scene === SCENES[0] && f === Math.round(FPS * 3.6)) {
      await page.screenshot({ path: path.join(OUT, 'hero-poster.jpg'), type: 'jpeg', quality: 80 })
    }
  }
  ff.stdin.end()
  await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg exit ' + c)))))
  console.log('wrote', path.relative(process.cwd(), file))
}

await browser.close()
