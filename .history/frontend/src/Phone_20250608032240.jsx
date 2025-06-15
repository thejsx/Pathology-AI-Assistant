import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer/simplepeer.min.js";
import { openSignallingSocket } from "./signalling";
import { config } from "simple-peer";

export default function Phone() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("initialising...");
  const remoteId = useRef(null);        // will hold viewer's ID
  const sock = useRef(null);
  const peer = useRef(null);
  console.log('Hello from Phone.jsx!');

  // navigator.mediaDevices.enumerateDevices().then(function (devices) {
  //   devices.forEach(function (device) {
  //     console.log(device.kind + ": " + device.label + " id = " + device.deviceId);
  //   });
  // });

  useEffect(() => {
    // 1️⃣ get rear camera ---------------------------------------------------
    (async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const backCam = devices.find(
        d => d.kind === "videoinput" && /back|rear|environment/i.test(d.label)
          );
      const constraints = backCam
        ? { video: { deviceId: { exact: backCam.deviceId } } }
        : { video: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      videoRef.current.srcObject = stream;

      // 2️⃣ open signalling --------------------------------------------------
      sock.current = openSignallingSocket(handleSignal);

      // 3️⃣ once we know our ID, create offer -------------------------------
      const waitId = setInterval(() => {
        const me = sock.current.peerId();
        if (me) {
          clearInterval(waitId);
          peer.current = new Peer({
            initiator: true,
            stream,
            config: {
              iceServers: [],
              iceCandidatePoolSize: 0
            }
          });

          peer.current.on("signal", (data) => {
            sock.current.send({ type: data.type ?? "candidate", target: remoteId.current ?? null, from: me, data });
          });
        }
      }, 50);
    })();
  }, []);

  // 4️⃣ handle messages from viewer -----------------------------------------
  function handleSignal(msg) {
    if (msg.type === "answer") {
      remoteId.current = msg.from;
      peer.current.signal(msg.data);
      setStatus("🟢 streaming to viewer");
    } else if (msg.type === "candidate") {
      console.log('candidate from viewer');
      peer.current.signal(msg.data);
    }
  }
  // log ICE progress
  // peer.current.on("iceStateChange", () =>
  //     console.log("PHONE ICE →", peer.current._pc.iceConnectionState)
  //   );
  // useEffect(() => {
  //   return () => peer.current?.destroy();   // inside Phone & Viewer
  // }, []);
  

  return (
    <div>
      <h2>Phone – camera publisher</h2>
      <p>{status}</p>
      <video ref={videoRef} playsInline muted autoPlay width="100%" />
    </div>
  );
}
