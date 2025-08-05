import { probeCameras } from "../utils/probeCameras";

export async function getRearCameraStream() {
  // First try to get the best rear camera directly
  const bestRear = await probeCameras(); // Ensure camera labels are populated
  console.log("Best rear camera found:", bestRear);
  const deviceId = bestRear?.deviceId || "";
  
  try {
    // return await navigator.mediaDevices.getUserMedia(constraints);
    return await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } }
    });
  } catch (err) {
    /* fallback if that exact camera isn’t found */
    console.warn("getRearCameraStream failed, falling back to enumerateDevices:", err);
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
