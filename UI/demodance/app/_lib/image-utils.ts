export async function shrinkImageFromUrl(inputUrl: string, maxSize = 256): Promise<string> {
  try {
    const response = await fetch(inputUrl);
    if (!response.ok) return inputUrl;
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    if (!Number.isFinite(longestEdge) || longestEdge <= maxSize) return inputUrl;

    const scale = maxSize / longestEdge;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return inputUrl;
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/webp", 0.88) || inputUrl;
  } catch {
    return inputUrl;
  }
}
