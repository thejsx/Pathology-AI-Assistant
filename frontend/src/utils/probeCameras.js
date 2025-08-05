// run this once after a "normal" getUserMedia call so labels are populated
export async function probeCameras() {
  const cams   = (await navigator.mediaDevices.enumerateDevices())
                  .filter(d => d.kind === "videoinput");

  const rows = [];
  for (const cam of cams) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: cam.deviceId } }, audio: false
      });
      const track = stream.getVideoTracks()[0];
      const caps  = track.getCapabilities?.() || {};
      const sets  = track.getSettings?.()     || {};

      rows.push({
        label      : cam.label || cam.deviceId.slice(0, 8) + "…",
        facing     : sets.facingMode || "—",
        defaultRes : `${sets.width}×${sets.height}`,
        maxRes     : caps.width ? `${caps.width.max}×${caps.height.max}` : "n/a",
        fpsRange   : caps.frameRate ? `${caps.frameRate.min}-${caps.frameRate.max}` : "n/a",
        zoomRange  : caps.zoom ? `${caps.zoom.min}-${caps.zoom.max}` : "n/a",
        deviceId   : cam.deviceId,
      });

      track.stop();                              // release hardware
    } catch (e) {
      console.warn("skip", cam.label, e.name);
    }
  }
  console.table(rows);                           // one consolidated view

  const bestRear = rows
  .filter(i => i.facing === "environment")
  .sort((a, b) => {
    const [wA, hA] = a.maxRes.split("×").map(Number);
    const [wB, hB] = b.maxRes.split("×").map(Number);
    return (wB * hB) - (wA * hA);
  })[0];

  return bestRear;
}

