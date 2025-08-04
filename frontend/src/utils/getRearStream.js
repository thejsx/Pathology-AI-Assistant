// utils/getRearStream.js
export async function getRearCameraStream() {
  // First try to get the best rear camera directly
  const constraints = {
    video: {
      facingMode: { ideal: "environment" },   // tells the UA “rear-facing please”
      width:  { ideal: 1920 },                // ask for high resolution
      height: { ideal: 1080 }
    }
  };
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    /* fallback if that exact camera isn’t found */
    const devices = await navigator.mediaDevices.enumerateDevices();
    const rear = devices.find(d =>
      d.kind === "videoinput" && /back|rear|environment/i.test(d.label)
    );
    return navigator.mediaDevices.getUserMedia(
      rear ? { video: { deviceId: { exact: rear.deviceId } } }
           : { video: true }
    );
  }
}
