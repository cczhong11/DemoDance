import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(__dirname, "..");
const recordingsDir = resolve(appDir, "recordings");
const mockVideoPath = resolve(recordingsDir, "mock-demo-upload.mp4");

const port = Number(process.env.PORT || 3100);
let baseUrl = process.env.DEMODANCE_RECORD_BASE_URL || `http://localhost:${port}`;
const viewport = {
  width: Number(process.env.RECORD_WIDTH || 1440),
  height: Number(process.env.RECORD_HEIGHT || 900),
};

const sampleSubmission = `DemoDance turns raw hackathon notes and screen recordings into a launch-ready product video. It helps builders explain the user problem, product story, technical architecture, and impact without spending the final night editing clips by hand.`;
const mockLogoDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAk0lEQVR4nO3QQQ3AMAwAsVL9d25gJ4QkikY2e4FB9s5zjr2eA7wHYA/AHoA9AHsA9gDsAdgDsAdgD8A2Q1r3T6s6mUwAAAAAAAAAAADgW9bqRrKkK2N5WQAAAAAAAAAAAOAb1upGsqQrY3lZAAAAAAAAAAAA4BvW6kaypCtjeVkAAAAAAAAAAADgG9bqRrKkK2N5WQAAAAAAAAAAAOAb/gCAiAdS0l9fLAAAAABJRU5ErkJggg==";
const mockAudioBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

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

async function canReach(url) {
  try {
    const res = await fetch(url, { redirect: "manual" });
    return res.status < 500;
  } catch {
    return false;
  }
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

async function clickWithPause(page, locator, pause = 900) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
  await wait(pause);
}

function chatCompletion(content) {
  return {
    id: "mock-chat-completion",
    object: "chat.completion",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
  };
}

async function installAiMocks(page) {
  let taskCounter = 0;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === "/api/text/chat") {
      const body = request.postDataJSON();
      const prompt = String(body?.prompt ?? body?.messages?.at?.(-1)?.content ?? "");
      if (prompt.includes("DemoDance parser")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            chatCompletion(
              JSON.stringify({
                audience_user: "Hackathon builders preparing a judged product demo.",
                audience_problem: "They have working features but not enough time to turn raw material into a persuasive story.",
                importance_evidence: "The uploaded demo shows several useful product moments that need clearer sequencing.",
                product_name: "DemoDance",
                product_slogan: "From raw demo to launch-ready.",
                feature1: "User pastes a submission and AI drafts the story structure.",
                feature2: "AI detects demo moments and converts them into chapter-ready features.",
                feature3: "The workflow generates storyboards, voiceover, captions, and export assets.",
                tech_stack: "Next.js, OpenAI GPT-5.4 Mini, BytePlus video tasks, IonRouter TTS, and FFmpeg export tooling.",
                impact: "DemoDance helps teams spend final hours improving product quality instead of editing from scratch.",
              }),
            ),
          ),
        });
      }
      if (prompt.includes("Return only JSON object")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            chatCompletion(
              JSON.stringify({
                user: "Hackathon founders and engineers polishing a final submission.",
                problem: "The demo story is scattered across notes, clips, and last-minute narration.",
                evidence: "Raw demo analysis found concrete product moments that can anchor the launch narrative.",
                name: "DemoDance",
                slogan: "From rough recording to launch-ready story.",
                feature1: "Paste context once and let AI shape the pitch.",
                feature2: "Convert demo moments into storyboard chapters.",
                feature3: "Generate voiceover and captions from the same script.",
                stack: "Next.js, OpenAI, BytePlus video generation, IonRouter TTS, and FFmpeg.",
                impact: "Teams can ship clearer demo videos with less end-of-hackathon editing stress.",
                script: "DemoDance turns raw project material into a focused launch video workflow.",
              }),
            ),
          ),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          chatCompletion("I tightened this section into a clearer launch-video beat and kept the product facts intact."),
        ),
      });
    }

    if (path === "/api/video/analyze") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          source_engine: "byteplus",
          confidence: 0.91,
          fallback_used: false,
          features: [
            "AI reads the submission and extracts a usable story arc.",
            "The workflow maps raw demo moments into storyboard chapters.",
            "The export step creates voiceover and caption assets.",
          ],
          segments: [
            { start: 0, end: 6, label: "Submission Parse", caption: "AI turns messy project notes into structured demo copy.", confidence: 0.92 },
            { start: 7, end: 14, label: "Storyboard", caption: "The app organizes features into chapter-ready scenes.", confidence: 0.9 },
          ],
        }),
      });
    }

    if (path === "/api/images/generations") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          created: Math.floor(Date.now() / 1000),
          model: "gpt-image-2",
          data: [{ url: mockLogoDataUrl, mime_type: "image/png" }],
        }),
      });
    }

    if (path === "/api/story/prompt" || path === "/api/scene/prompt" || path === "/api/voice/prompt") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          prompt: `Mock ${path.split("/")[2]} prompt for section-specific AI generation. Include story, scene, voice, timing, and continuity constraints.`,
          parts: [{ file: "runtime-ts-constant", title: "Mocked runtime prompt" }],
        }),
      });
    }

    if (path === "/api/video/tasks" && request.method() === "POST") {
      taskCounter += 1;
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: { task_id: `mock-video-task-${taskCounter}` } }),
      });
    }

    if (path.startsWith("/api/video/tasks/") && request.method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            status: "succeeded",
            progress: 100,
            content: { video_url: `https://example.com/mock-${path.split("/").pop()}.mp4` },
          },
        }),
      });
    }

    if (path === "/api/audio/speech") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ audio_base64: mockAudioBase64, mime_type: "audio/wav" }),
      });
    }

    return route.continue();
  });
}

async function runRecording() {
  mkdirSync(recordingsDir, { recursive: true });
  writeFileSync(mockVideoPath, Buffer.from("mock video bytes for recorder upload"));

  let server = null;
  if (!process.env.DEMODANCE_RECORD_BASE_URL && !(await canReach(`${baseUrl}/onboarding`))) {
    const existingDevUrl = "http://localhost:3000";
    if (await canReach(`${existingDevUrl}/onboarding`)) {
      baseUrl = existingDevUrl;
    } else {
      server = await startDevServerIfNeeded();
    }
  }
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
    await installAiMocks(page);
    await page.goto(`${baseUrl}/onboarding`, { waitUntil: "networkidle" });
    const video = page.video();

    await wait(1000);
    await page.locator("textarea").first().click();
    await page.keyboard.type(sampleSubmission, { delay: 8 });
    await wait(700);
    await page.locator('input[type="file"]').setInputFiles(mockVideoPath);
    await wait(700);

    await clickWithPause(page, page.getByRole("button", { name: /Let AI draft|让 AI 起草/i }), 1800);

    await page.waitForURL("**/workflow");
    await page.waitForSelector("text=Target User & Problem");
    await wait(1200);

    await page.locator("input.dd-input").first().fill("DemoDance");
    await wait(700);
    await clickWithPause(page, page.getByRole("button", { name: /AI Suggest|AI 建议/i }), 1400);
    await page.locator("textarea").last().fill("Make this section punchier and ready for a 90-second launch video.");
    await clickWithPause(page, page.getByRole("button", { name: /^Send$/i }), 1400);
    await clickWithPause(page, page.getByRole("button", { name: /Product Intro|产品亮相/i }), 1100);
    await clickWithPause(page, page.getByRole("button", { name: /Generate Logo|生成 Logo/i }), 1600);
    await clickWithPause(page, page.getByRole("button", { name: /Features|功能介绍/i }), 1100);
    await clickWithPause(page, page.getByRole("button", { name: /Tech Stack|技术栈/i }), 1100);
    await clickWithPause(page, page.getByRole("button", { name: /Future Impact|未来影响/i }), 900);

    await page.goto(`${baseUrl}/generate`, { waitUntil: "networkidle" });
    await page.waitForURL("**/generate");
    await page.waitForSelector("text=Storyboard Generation");
    await wait(1200);
    await clickWithPause(page, page.getByRole("button", { name: /Generate Storyboards/i }), 2500);

    await page.mouse.wheel(0, 520);
    await wait(1000);
    await clickWithPause(page, page.getByRole("button", { name: /Generate Voiceover \+ SRT/i }), 1600);
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
    if (existsSync(mockVideoPath)) unlinkSync(mockVideoPath);
  }
}

runRecording().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
