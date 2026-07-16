/**
 * Browser-side meeting client: a chunked asset uploader and a small WebRTC mesh
 * for multi-participant video.
 *
 * The mesh connects every participant to every other participant peer-to-peer,
 * exchanging SDP/ICE through the polling signaling API. This works out of the
 * box for small meetings; for large rooms, swap the transport for a WebRTC SFU
 * (LiveKit / mediasoup / Daily) — the room UI only depends on the callbacks
 * below, not on how media is routed.
 */

// ---- Asset upload (reuses the presigned direct-to-storage flow) ------------

export interface UploadProgress {
  loaded: number;
  total: number;
  pct: number;
}

export async function uploadMeetingAsset(
  meetingId: string | number,
  file: File,
  meta: { kind: string; title?: string; uploadedByName?: string },
  onProgress?: (p: UploadProgress) => void,
): Promise<number> {
  const initRes = await fetch(`/api/meetings/${meetingId}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: meta.title || file.name,
      kind: meta.kind,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      uploadedByName: meta.uploadedByName,
    }),
  });
  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error(err.hint || err.error || 'Could not start the upload.');
  }
  const init = await initRes.json();
  const report = (loaded: number) =>
    onProgress?.({ loaded, total: file.size, pct: file.size ? Math.round((loaded / file.size) * 100) : 100 });

  if (init.mode === 'single') {
    await putPart(init.url, file, file.type, (l) => report(l));
    await completeAsset(meetingId, init.assetId);
    return init.assetId;
  }

  const parts: { partNumber: number; etag: string }[] = [];
  let done = 0;
  for (const part of init.parts) {
    const start = (part.partNumber - 1) * init.partSize;
    const blob = file.slice(start, start + init.partSize);
    const etag = await putPart(part.url, blob, file.type, (l) => report(done + l));
    if (!etag) throw new Error('Storage did not return an ETag — check bucket CORS ExposeHeaders.');
    parts.push({ partNumber: part.partNumber, etag: etag.replace(/"/g, '') });
    done += blob.size;
    report(done);
  }
  await completeAsset(meetingId, init.assetId, parts);
  return init.assetId;
}

function putPart(url: string, body: Blob, contentType: string, onProgress: (loaded: number) => void): Promise<string | null> {
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

async function completeAsset(meetingId: string | number, assetId: number, parts?: { partNumber: number; etag: string }[]) {
  const res = await fetch(`/api/meetings/${meetingId}/assets/${assetId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parts ? { parts } : {}),
  });
  if (!res.ok) throw new Error('Could not finalize the upload.');
}

// ---- WebRTC mesh -----------------------------------------------------------

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export interface MeshCallbacks {
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
  onPeerLeave: (peerId: string) => void;
}

export class MeetingMesh {
  private meetingId: string | number;
  private peerId: string;
  private localStream: MediaStream;
  private cbs: MeshCallbacks;
  private peers = new Map<string, RTCPeerConnection>();
  private since = 0;
  private polling = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(meetingId: string | number, peerId: string, localStream: MediaStream, cbs: MeshCallbacks) {
    this.meetingId = meetingId;
    this.peerId = peerId;
    this.localStream = localStream;
    this.cbs = cbs;
  }

  async start() {
    this.polling = true;
    await this.post({ fromPeer: this.peerId, kind: 'join' });
    this.loop();
  }

  stop() {
    this.polling = false;
    if (this.timer) clearTimeout(this.timer);
    this.post({ fromPeer: this.peerId, kind: 'leave' }).catch(() => {});
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
  }

  private async post(sig: { fromPeer: string; toPeer?: string; kind: string; payload?: unknown }) {
    await fetch(`/api/meetings/${this.meetingId}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sig),
    });
  }

  private peer(remoteId: string): RTCPeerConnection {
    let pc = this.peers.get(remoteId);
    if (pc) return pc;
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.localStream.getTracks().forEach((t) => pc!.addTrack(t, this.localStream));
    pc.ontrack = (e) => this.cbs.onRemoteStream(remoteId, e.streams[0]);
    pc.onicecandidate = (e) => {
      if (e.candidate) this.post({ fromPeer: this.peerId, toPeer: remoteId, kind: 'ice', payload: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      if (pc!.connectionState === 'failed' || pc!.connectionState === 'closed') {
        this.cbs.onPeerLeave(remoteId);
      }
    };
    this.peers.set(remoteId, pc);
    return pc;
  }

  // "Polite" peer (higher id) waits; "impolite" peer initiates — avoids glare.
  private async loop() {
    while (this.polling) {
      try {
        const res = await fetch(`/api/meetings/${this.meetingId}/signal?peer=${encodeURIComponent(this.peerId)}&since=${this.since}`);
        const data = await res.json();
        this.since = data.lastId ?? this.since;
        for (const s of data.signals || []) {
          await this.handle(s);
        }
      } catch {
        /* transient network error — keep polling */
      }
      await new Promise((r) => (this.timer = setTimeout(r, 1500)));
    }
  }

  private async handle(s: { from: string; kind: string; payload: string | null }) {
    const from = s.from;
    if (from === this.peerId) return;
    const payload = s.payload ? JSON.parse(s.payload) : null;

    if (s.kind === 'join') {
      // A new peer joined. Lower-id side initiates the offer.
      if (this.peerId < from) {
        const pc = this.peer(from);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await this.post({ fromPeer: this.peerId, toPeer: from, kind: 'offer', payload: offer });
      }
    } else if (s.kind === 'offer') {
      const pc = this.peer(from);
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await this.post({ fromPeer: this.peerId, toPeer: from, kind: 'answer', payload: answer });
    } else if (s.kind === 'answer') {
      const pc = this.peer(from);
      await pc.setRemoteDescription(new RTCSessionDescription(payload));
    } else if (s.kind === 'ice') {
      const pc = this.peer(from);
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload));
      } catch {
        /* ignore out-of-order candidate */
      }
    } else if (s.kind === 'leave') {
      const pc = this.peers.get(from);
      if (pc) pc.close();
      this.peers.delete(from);
      this.cbs.onPeerLeave(from);
    }
  }
}
