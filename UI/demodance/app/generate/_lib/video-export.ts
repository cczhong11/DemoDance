function toStrictArrayBuffer(data: unknown): ArrayBuffer {
  const bytes = data instanceof Uint8Array ? Uint8Array.from(data) : new TextEncoder().encode(String(data));
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
}

export function buildExportFileName(projectName: string): string {
  const safeName = (projectName || "DemoDance").trim().replace(/\s+/g, "_");
  return `${safeName}_final.mp4`;
}

export async function combineVideoUrls(videoUrls: string[]): Promise<string> {
  if (videoUrls.length === 0) throw new Error("No completed sections");

  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
  const ffmpeg = new FFmpeg();
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  let concatList = "";
  for (let i = 0; i < videoUrls.length; i += 1) {
    const inputName = `input${i}.mp4`;
    const proxyUrl = `/api/video/proxy?url=${encodeURIComponent(videoUrls[i])}`;
    await ffmpeg.writeFile(inputName, await fetchFile(proxyUrl));
    concatList += `file '${inputName}'\n`;
  }

  await ffmpeg.writeFile("concat.txt", concatList);
  await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "output.mp4"]);
  const data = await ffmpeg.readFile("output.mp4");
  return URL.createObjectURL(new Blob([toStrictArrayBuffer(data)], { type: "video/mp4" }));
}
