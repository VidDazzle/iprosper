/** Browser uploader for deliverable file items (presigned direct-to-storage). */

export interface UploadProgress {
  loaded: number;
  total: number;
  pct: number;
}

export async function uploadDeliverableItem(
  deliverableId: string | number,
  file: File,
  meta: { kind: string; title?: string; description?: string },
  onProgress?: (p: UploadProgress) => void,
): Promise<number> {
  const initRes = await fetch(`/api/deliverables/${deliverableId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: meta.kind,
      title: meta.title || file.name,
      description: meta.description,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    }),
  });
  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error(err.hint || err.error || 'Could not start the upload.');
  }
  const init = await initRes.json();
  const itemId = init.item.id;
  const report = (loaded: number) =>
    onProgress?.({ loaded, total: file.size, pct: file.size ? Math.round((loaded / file.size) * 100) : 100 });

  if (init.mode === 'single') {
    await put(init.url, file, file.type, (l) => report(l));
    await complete(deliverableId, itemId);
    return itemId;
  }

  const parts: { partNumber: number; etag: string }[] = [];
  let done = 0;
  for (const part of init.parts) {
    const start = (part.partNumber - 1) * init.partSize;
    const blob = file.slice(start, start + init.partSize);
    const etag = await put(part.url, blob, file.type, (l) => report(done + l));
    if (!etag) throw new Error('Storage did not return an ETag — check bucket CORS ExposeHeaders.');
    parts.push({ partNumber: part.partNumber, etag: etag.replace(/"/g, '') });
    done += blob.size;
    report(done);
  }
  await complete(deliverableId, itemId, parts);
  return itemId;
}

function put(url: string, body: Blob, contentType: string, onProgress: (loaded: number) => void): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    if (contentType) xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.getResponseHeader('ETag')) : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(body);
  });
}

async function complete(deliverableId: string | number, itemId: number, parts?: { partNumber: number; etag: string }[]) {
  const res = await fetch(`/api/deliverables/${deliverableId}/items/${itemId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parts ? { parts } : {}),
  });
  if (!res.ok) throw new Error('Could not finalize the upload.');
}
