/**
 * getRearStream.js  –  fast, reliable rear‑camera picker
 *
 * • Opens ONE tiny stream to unlock permission + labels (≈ 80 ms).
 * • Picks the “main” rear lens by label heuristics.
 * • Stops the first stream before opening the final one –‑ avoids
 *   NotReadableError on phones that forbid two concurrent rear streams.
 * • Returns a ready‑to‑use MediaStream (or a sensible fallback).
 */

export async function getRearCameraStream() {
  /* ───────── 1. quick permission / label unlock ───────── */
  let tmp;
  try {
    tmp = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 320 } }
    });
  } catch (e) {
    console.warn("env‑facing gUM failed; falling back:", e.name);
    return navigator.mediaDevices.getUserMedia({ video: true });
  }

  /* ───────── 2. decide which rear cam is “best” ───────── */
  const currentId = tmp.getVideoTracks()[0].getSettings().deviceId;
  const envCams   = (await navigator.mediaDevices.enumerateDevices())
    .filter(d => d.kind === "videoinput" && /back|rear|environment/i.test(d.label));

  if (envCams.length === 0) {
    // no labelled rear cameras → keep what we already have
    return tmp;
  }

  const rank = (label) => {
    if (/camera.*\b0\b/i.test(label)) return 0;   // many Android mains
    if (/main|wide/i.test(label))     return 1;   // iOS “Back Camera”, etc.
    return 2;
  };
  envCams.sort((a, b) => rank(a.label) - rank(b.label));
  const best = envCams[0];

  if (best.deviceId === currentId) {
    return tmp;                                   // we’re already on it
  }

  /* ───────── 3. switch streams (stop first, open best) ───────── */
  tmp.getTracks().forEach(t => t.stop());         // release hardware
  await sleep(100);                               // let OS settle

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { deviceId: { exact: best.deviceId } }
    });
  } catch (e) {
    console.warn("switch to preferred rear cam failed:", e.name);
    // fallback: reopen the original env stream so caller still gets video
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { deviceId: { exact: currentId } }
    });
  }
}

/* small helper */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

