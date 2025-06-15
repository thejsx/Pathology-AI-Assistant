import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer/simplepeer.min.js";
import { openSignallingSocket } from "../webrtc/signalling";

export default function Phone() {
  const videoRef  = useRef(null);
  const peerRef   = useRef(null);
  const sockRef   = useRef(null);
  const remoteId  = useRef(null);
  const [status, setStatus] = useState("initialising…");

  useEffect(() => {
    let mounted = true;                           // helps us ignore late callbacks

    (async () => {
      /* 1️⃣ rear camera ---------------------------------------------------- */
      const devices = await navigator.mediaDevices.enumerateDevices();
      const backCam = devices.find(
        d => d.kind === "videoinput" && /back|rear|environment/i.test(d.label)
      );
      const stream = await navigator.mediaDevices.getUserMedia(
        backCam ? { video: { deviceId: { exact: backCam.deviceId } } }
                : { video: true }
      );
      if (!mounted) return;
      videoRef.current.srcObject = stream;

      /* 2️⃣ signalling channel -------------------------------------------- */
      sockRef.current = openSignallingSocket(handleSignal);

      /* 3️⃣ when we learn our socket-ID, create the Peer ------------------- */
      var index = 0
      const wait = setInterval(() => {


        const me = sockRef.current.peerId();
        if (!me) return;

        clearInterval(wait);
        peerRef.current = new Peer({
          initiator: true,
          stream,
          config: { iceServers: [], iceCandidatePoolSize: 0 }
        });
        console.log(index);
        index += 1;
        peerRef.current.on("signal", data => {
          console.log("PHONE →", data);
          sockRef.current.send({
            type: data.type ?? "candidate",
            target: remoteId.current ?? null,   // null → broadcast
            from:   me,
            data
          });
        });

        peerRef.current.on("iceStateChange", () =>
          console.log("PHONE ICE →", peerRef.current._pc.iceConnectionState)
        );
      }, 500);
    })();

    /* 🔚 cleanup on unmount / HMR ----------------------------------------- */
    return () => {
      mounted = false;
      peerRef.current?.destroy();
      sockRef.current?.send({ type: "hangup" });
      sockRef.current = null;
    };
  }, []);

  /* messages arriving from the viewer ------------------------------------- */
  function handleSignal(msg) {
    console.log("PHONE ←", msg);
    if (!peerRef.current) return;                     // not ready yet
    /* (re)connection request from a freshly-reloaded viewer */
    if (msg.type === "ready") {
      console.log("PHONE → viewer is ready again");
      remoteId.current = msg.from;          // new viewer socket-ID
      peerRef.current?.destroy();           // drop previous peer
    
      /* create a brand-new Peer and stream to the new viewer */
      peerRef.current = new Peer({
        initiator: true,
        stream: videoRef.current.srcObject, // we still have the camera
        config: { iceServers: [], iceCandidatePoolSize: 0 }
      });
      peerRef.current.on("signal", data => {
        sockRef.current.send({
          type: data.type ?? "candidate",
          target: remoteId.current,
          from:   sockRef.current.peerId(),
          data
        });
      });
      peerRef.current.on("iceStateChange", () =>
        console.log("PHONE ICE →", peerRef.current._pc.iceConnectionState)
      );
      setStatus("🟢 streaming to viewer");
      return;                               // DONE for this message
    }
    else if (msg.type === "answer") {
      remoteId.current = msg.from;
      peerRef.current.signal(msg.data);
      setStatus("🟢 streaming to viewer");
    } 
    else if (msg.type === "candidate") {
      peerRef.current.signal(msg.data);
    }
  }

  return (
    <div>
      <h2>Phone – camera publisher</h2>
      <p>{status}</p>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        width="100%"
      />
    </div>
  );
}
