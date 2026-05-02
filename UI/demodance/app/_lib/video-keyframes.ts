type VideoSegment = {
  start: number;
  end: number;
};

function toStrictArrayBuffer(data: Uint8Array): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(arrayBuffer).set(data);
  return arrayBuffer;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read extracted frame"));
    reader.readAsDataURL(blob);
  });
}

type BrowserFfmpeg = {
  writeFile: (path: string, data: Uint8Array) => Promise<unknown>;
  readFile: (path: string) => Promise<unknown>;
  exec: (args: string[]) => Promise<number>;
  deleteFile?: (path: string) => Promise<unknown>;
};

let ffmpegLoadPromise: Promise<BrowserFfmpeg> | undefined;

async function getFfmpeg() {
  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg as unknown as BrowserFfmpeg;
    })();
  }

  return ffmpegLoadPromise;
}

export async function extractFeatureKeyframes(file: File, segments: VideoSegment[]): Promise<string[]> {
  const ffmpeg = await getFfmpeg();
  const { fetchFile } = await import("@ffmpeg/util");

  const inputName = `feature-source-${Date.now()}.mp4`;
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const fallbackTimes = [1, 2.5, 4];
  const candidateTimes = (segments.length > 0
    ? segments.slice(0, 3).map((segment, index) => {
        const start = Number.isFinite(segment.start) ? Math.max(0, segment.start) : fallbackTimes[index] ?? 1;
        const end = Number.isFinite(segment.end) ? Math.max(start, segment.end) : start + 1;
        return Math.max(0, start + Math.max(0.1, (end - start) / 2));
      })
    : fallbackTimes
  ).slice(0, 3);

  const frames: string[] = [];
  for (let index = 0; index < candidateTimes.length; index += 1) {
    const outputName = `feature-frame-${Date.now()}-${index}.jpg`;
    await ffmpeg.exec([
      "-ss",
      candidateTimes[index].toFixed(2),
      "-i",
      inputName,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      outputName,
    ]);
    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? data : new Uint8Array();
    const blob = new Blob([toStrictArrayBuffer(bytes)], { type: "image/jpeg" });
    frames.push(await blobToDataUrl(blob));
    if (typeof ffmpeg.deleteFile === "function") {
      await ffmpeg.deleteFile(outputName).catch(() => undefined);
    }
  }

  if (typeof ffmpeg.deleteFile === "function") {
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
  }

  return frames;
}
