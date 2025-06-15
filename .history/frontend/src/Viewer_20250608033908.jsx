import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer/simplepeer.min.js";
import { openSignallingSocket } from "./signalling";

export default function Viewer() {
  const videoRef  = useRef(null);
  const peerRef   = useRef(null);
  const sockRef   = useRef(null);
  const phoneId   = useRef(null);
  const meId      = useRef(null);
  const [status, setStatus] = useState("waiting for phone…");

  /* open WebSocket once ---------------------------------------------------- */
  useEffect(() => {
    sockRef.current = openSignallingSocket(handleSignal);

    return () => {                               // 🔚 cleanup
      peerRef.current?.destroy();
      sockRef.current?.send({ type: "hangup" });
      sockRef.current = null;
    };
  }, []);

  /* handle signalling from the phone -------------------------------------- */
  function handleSignal(msg) {
    if (msg.type === "offer") {
      /* 1️⃣ remember IDs */
      phoneId.current = msg.from;
      meId.current    = sockRef.current.peerId();

      /* 2️⃣ make the Peer & feed the offer */
      peerRef.current = new Peer({
        initiator: false,
        config: { iceServers: [], iceCandidatePoolSize: 0 }
      });
      peerRef.current.signal(msg.data);

      /* 3️⃣ forward every local signal back to the phone */
      peerRef.current.on("signal", data => {
        sockRef.current.send({
          type:   data.type ?? "candidate",
          target: phoneId.current,
          from:   meId.current,
          data
        });
      });

      /* 4️⃣ remote stream ready */
      peerRef.current.on("stream", stream => {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(console.warn);
        };
        setStatus("🟢 receiving video");
      });

      peerRef.current.on("iceStateChange", () =>
        console.log("VIEWER ICE →", peerRef.current._pc.iceConnectionState)
      );
    } else if (msg.type === "candidate") {
      peerRef.current?.signal(msg.data);
    }
  }

  return (
    <div>
      <h2>Viewer – microscope display</h2>
      <p>{status}</p>
      <video
        ref={videoRef}
        playsInline
        muted         {/* ← ensures autoplay */}
        autoPlay
        width="100%"
      />
    </div>
  );
}
