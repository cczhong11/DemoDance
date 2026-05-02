import type { StoredAssetRef } from "../_state/workflow-store";

type StoreGeneratedImageResponse = StoredAssetRef & {
  ok: boolean;
};

export async function storeGeneratedImage(sourceUrl: string, fileName: string): Promise<StoredAssetRef> {
  const response = await fetch("/api/storage/images", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceUrl,
      fileName,
    }),
  });

  if (!response.ok) {
    let message = `Failed to store generated image (${response.status})`;
    try {
      const parsed = (await response.json()) as { error?: string; details?: string };
      message = parsed.details || parsed.error || message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  const parsed = (await response.json()) as StoreGeneratedImageResponse;
  if (!parsed.objectId || !parsed.url) {
    throw new Error("Stored image response was missing asset metadata");
  }

  return {
    objectId: parsed.objectId,
    url: parsed.url,
    fileName: parsed.fileName,
    contentType: parsed.contentType,
    sizeBytes: parsed.sizeBytes,
  };
}
