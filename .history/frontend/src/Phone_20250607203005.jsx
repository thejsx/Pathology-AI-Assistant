import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer/simplepeer.min.js";
import { openSignallingSocket } from "./signalling";

export default function Phone() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("initialising...");
  const remoteId = useRef(null);        // will hold viewer's ID
  const sock = useRef(null);
  const peer = useRef(null);
  console.log('Hello from Phone.jsx!');

  useEffect(() => {
    // 1️⃣ get local camera ---------------------------------------------------
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
            trickle: false,
            stream,
          });

          peer.current.on("signal", (data) => {
            sock.current.send({ type: "offer", target: null, from: me, data });
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
      peer.current.signal(msg.data);
    }
  }

  return (
    <div>
      <h2>Phone – camera publisher</h2>
      <p>{status}</p>
      <video ref={videoRef} playsInline muted autoPlay width="100%" />
    </div>
  );
}
