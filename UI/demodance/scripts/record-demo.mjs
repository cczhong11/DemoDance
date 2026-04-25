import { existsSync, mkdirSync, renameSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(__dirname, "..");
const recordingsDir = resolve(appDir, "recordings");

const port = Number(process.env.PORT || 3100);
const baseUrl = process.env.DEMODANCE_RECORD_BASE_URL || `http://localhost:${port}`;
const viewport = {
  width: Number(process.env.RECORD_WIDTH || 1440),
  height: Number(process.env.RECORD_HEIGHT || 900),
};

const sampleSubmission = `DemoDance turns raw hackathon notes and screen recordings into a launch-ready product video. It helps builders explain the user problem, product story, technical architecture, and impact without spending the final night editing clips by hand.`;

const seededState = {
  projectName: "DemoDance",
  submission: sampleSubmission,
  demoVideo: null,
  activeStepId: "audience",
  fieldValues: {
    "audience.user": "Hackathon teams, solo builders, and startup engineers preparing a final demo.",
    "audience.problem": "Great products often lose judging momentum because the story is scattered across raw notes, rough recordings, and unfinished narration.",
    "importance.evidence": "Short launch windows reward teams that can explain value quickly, show proof, and keep the demo flow coherent.",
    "product.name": "DemoDance",
    "product.slogan": "From raw demo to launch-ready.",
    "product.logo": "",
    "features.feature1": "Paste a submission and let AI draft the narrative structure.",
    "features.feature2": "Turn product steps into storyboard-ready chapters.",
    "features.feature3": "Generate voiceover, video sections, and an export plan from one workflow.",
    "tech.stack": "Next.js, React, API routes, AI text generation, image generation, video tasks, and FFmpeg-style export orchestration.",
    "impact.impact": "DemoDance gives builders more time to polish the product while still shipping a clear, persuasive launch video.",
  },
  stepScripts: {
    audience: "Every hackathon team knows the last-hour scramble: the product works, but the story still needs shape.",
    importance: "Judges need clarity fast. DemoDance turns messy material into a confident narrative before attention drops.",
    product: "Meet DemoDance: an AI workflow that transforms raw demo assets into a launch-ready video.",
    features: "Start with your submission, refine each story chapter, generate storyboards, then export a polished demo video.",
    tech: "The app combines a Next.js interface with AI services for script, visual, voice, and video generation.",
    impact: "The result is simple: less editing stress, stronger storytelling, and more time for teams to build.",
  },
  chat: [
    {
      role: "ai",
      tag: "Demo Ready",
      text: "I prefilled a launch-video workflow so the recording can focus on the product experience.",
    },
  ],
  renderSections: [
    { id: "audience", title: "Target User & Problem", summary: "Teams need a clearer demo story.", status: "done", durationSec: 15, version: 1, progress: 100 },
    { id: "importance", title: "Why It Matters", summary: "Judges need clarity quickly.", status: "done", durationSec: 15, version: 1, progress: 100 },
    { id: "product", title: "Product Intro", summary: "DemoDance turns raw assets into video.", status: "done", durationSec: 20, version: 1, progress: 100 },
    { id: "features", title: "Features", summary: "Script, storyboard, generate, export.", status: "done", durationSec: 30, version: 1, progress: 100 },
    { id: "impact", title: "Future Impact", summary: "Builders save time and launch better.", status: "done", durationSec: 20, version: 1, progress: 100 },
  ],
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForServer(url, timeoutMs = 60_000) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    async function check() {
      try {
        const res = await fetch(url, { redirect: "manual" });
        if (res.status < 500) {
          resolve();
          return;
        }
      } catch {
        // Server is still booting.
      }

      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }

      setTimeout(check, 750);
    }

    void check();
  });
}

function isPortFree(portNumber) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(portNumber, "127.0.0.1");
  });
}

async function startDevServerIfNeeded() {
  if (process.env.DEMODANCE_RECORD_BASE_URL) return null;
  if (!(await isPortFree(port))) return null;

  const child = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
    cwd: appDir,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));

  return child;
}

async function seedWorkflow(page) {
  await page.evaluate((state) => {
    window.sessionStorage.setItem("demodance.workflow.v2", JSON.stringify(state));
  }, seededState);
}

async function clickWithPause(page, locator, pause = 900) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
  await wait(pause);
}

async function runRecording() {
  mkdirSync(recordingsDir, { recursive: true });

  const server = await startDevServerIfNeeded();
  await waitForServer(`${baseUrl}/onboarding`);

  const browser = await chromium.launch({
    headless: process.env.HEADED !== "1",
    slowMo: Number(process.env.SLOW_MO || 60),
  });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    recordVideo: {
      dir: recordingsDir,
      size: viewport,
    },
  });

  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/onboarding`, { waitUntil: "networkidle" });
    const video = page.video();

    await wait(1000);
    await page.locator("textarea").first().click();
    await page.keyboard.type(sampleSubmission, { delay: 8 });
    await wait(700);

    await seedWorkflow(page);
    await clickWithPause(page, page.getByRole("link", { name: /Skip/i }), 1200);

    await page.waitForURL("**/workflow");
    await page.waitForSelector("text=Target User & Problem");
    await wait(1200);

    await page.locator("input.dd-input").first().fill("DemoDance");
    await wait(700);
    await clickWithPause(page, page.getByRole("button", { name: /Product Intro|产品亮相/i }), 1100);
    await clickWithPause(page, page.getByRole("button", { name: /Features|功能介绍/i }), 1100);
    await clickWithPause(page, page.getByRole("button", { name: /Tech Stack|技术栈/i }), 1100);
    await clickWithPause(page, page.getByRole("button", { name: /Future Impact|未来影响/i }), 900);

    await page.goto(`${baseUrl}/generate`, { waitUntil: "networkidle" });
    await page.waitForURL("**/generate");
    await page.waitForSelector("text=Storyboard Generation");
    await wait(1200);

    await page.mouse.wheel(0, 520);
    await wait(1000);
    await page.mouse.wheel(0, 720);
    await wait(1200);
    await page.getByRole("button", { name: /Combine & Export/i }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Combine & Export/i }).hover({ force: true });
    await wait(1800);

    await wait(1500);

    await context.close();
    const rawVideoPath = await video.path();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const finalPath = resolve(recordingsDir, `demodance-demo-${stamp}.webm`);
    if (existsSync(rawVideoPath)) renameSync(rawVideoPath, finalPath);

    console.log(`\nRecorded demo video: ${finalPath}`);
  } finally {
    await browser.close().catch(() => {});
    if (server) server.kill("SIGTERM");
  }
}

runRecording().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
