import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer/simplepeer.min.js";
import { openSignallingSocket } from "./signalling";

export default function Viewer() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("waiting for phone ...");
  const sock = useRef(null);
  const peer = useRef(null);
  const phoneId = useRef(null);      // filled once we receive an offer
  const meId = useRef(null);
  console.log('Hello from Viewer.jsx!');

  useEffect(() => {
    sock.current = openSignallingSocket(handleSignal);
  }, []);

  // handle messages from phone ---------------------------------------------
  function handleSignal(msg) {
    if (msg.type === "offer") {
      // 1️⃣ save IDs ---------------------------------------------------------
      phoneId.current = msg.from;
      meId.current = sock.current.peerId();

      // 2️⃣ create Peer, feed remote offer ----------------------------------
      peer.current = new Peer({ initiator: false, config: { iceServers: [], iceCandidatePoolSize: 0 } });
      peer.current.signal(msg.data);

      // 3️⃣ once we have an answer, send it directly ------------------------
      peer.current.on("signal", (data) => {
        sock.current.send({
          type: data.type ?? "candidate",
          target: phoneId.current,
          from: meId.current,
          data,
        });
      });

      // 4️⃣ when stream arrives, attach to video ----------------------------
      peer.current.on("stream", (stream) => {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.warn("auto-play failed:", e));
        }
        setStatus("🟢 receiving video");
      });
    } else if (msg.type === "candidate") {
      console.log("Received ICE candidate from phone");
      peer.current?.signal(msg.data);
    }
  }
  // peer.current.on("iceStateChange", () =>
  //   console.log("VIEWER ICE state:", peer.current._pc.iceConnectionState)
  // );

  // useEffect(() => {
  //   return () => peer.current?.destroy();   // inside Phone & Viewer
  // }, []);
  

  return (
    <div>
      <h2>Viewer – microscope display</h2>
      <p>{status}</p>
      <video ref={videoRef} playsInline autoPlay width="100%" />
    </div>
  );
}
