/**
 * Browser-side chunked uploader for large email attachments.
 *
 * Drives the presigned upload flow entirely from the client so the bytes go
 * straight to object storage and never through the app server:
 *   1. POST /api/mail/attachments/init  → an upload ticket (single or multipart)
 *   2. PUT the file (or each ~100 MB part) directly to the presigned URL(s)
 *   3. POST /api/mail/attachments/[id]/complete → finalize
 *
 * This is what makes full-length videos and multi-GB documents work in the
 * browser without loading the whole file into memory (each part is a `Blob`
 * slice) and without hitting serverless request-body limits.
 *
 * Note: multipart needs the storage bucket's CORS policy to allow PUT and to
 * expose the `ETag` response header to this origin.
 */

export interface UploadProgress {
  loaded: number;
  total: number;
  pct: number;
}

interface InitSingle {
  attachmentId: number;
  mode: 'single';
  url: string;
}
interface InitMultipart {
  attachmentId: number;
  mode: 'multipart';
  partSize: number;
  parts: { partNumber: number; url: string }[];
}

/** Upload one file; returns the attachmentId to attach to a message. */
export async function uploadAttachment(
  file: File,
  onProgress?: (p: UploadProgress) => void,
): Promise<number> {
  const initRes = await fetch('/api/mail/attachments/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    }),
  });
  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error(err.hint || err.error || 'Could not start the upload.');
  }
  const init = (await initRes.json()) as InitSingle | InitMultipart;
  const report = (loaded: number) =>
    onProgress?.({ loaded, total: file.size, pct: file.size ? Math.round((loaded / file.size) * 100) : 100 });

  if (init.mode === 'single') {
    await putWithProgress(init.url, file, file.type, (loaded) => report(loaded));
    await complete(init.attachmentId);
    return init.attachmentId;
  }

  // Multipart: upload each part, tracking cumulative progress.
  const parts: { partNumber: number; etag: string }[] = [];
  let uploadedBefore = 0;
  for (const part of init.parts) {
    const start = (part.partNumber - 1) * init.partSize;
    const blob = file.slice(start, start + init.partSize);
    const etag = await putWithProgress(part.url, blob, file.type, (loaded) =>
      report(uploadedBefore + loaded),
    );
    if (!etag) throw new Error('Storage did not return an ETag — check the bucket CORS ExposeHeaders.');
    parts.push({ partNumber: part.partNumber, etag: etag.replace(/"/g, '') });
    uploadedBefore += blob.size;
    report(uploadedBefore);
  }
  await complete(init.attachmentId, parts);
  return init.attachmentId;
}

/** PUT via XHR so we get upload progress events; resolves with the ETag header. */
function putWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress: (loaded: number) => void,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    if (contentType) xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.getResponseHeader('ETag'));
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(body);
  });
}

async function complete(attachmentId: number, parts?: { partNumber: number; etag: string }[]) {
  const res = await fetch(`/api/mail/attachments/${attachmentId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parts ? { parts } : {}),
  });
  if (!res.ok) throw new Error('Could not finalize the upload.');
}

/** Fetch a fresh download URL and open it. */
export async function downloadAttachment(attachmentId: number) {
  const res = await fetch(`/api/mail/attachments/${attachmentId}`);
  if (!res.ok) throw new Error('Could not get a download link.');
  const data = await res.json();
  if (data.downloadUrl) window.open(data.downloadUrl, '_blank');
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
