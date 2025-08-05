import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer/simplepeer.min.js";
import { openSignallingSocket } from "../communications/signalling";
import { getRearCameraStream } from "../utils/getRearStream";
import "../styles/Phone.css"; 

export default function Phone() {
  const videoRef  = useRef(null);
  const peerRef   = useRef(null);
  const sockRef   = useRef(null);
  const remoteId  = useRef(null);
  const [camChoices, setCamChoices] = useState([]);
  const [status, setStatus] = useState("initialising…");
  const [zoomInfo, setZoomInfo] = useState(null);
  const [selectedId, setSelectedId] = useState("");

  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,   // small pool is plenty for one‑to‑one calls
  };

  useEffect(() => {
    let mounted = true;                           // helps us ignore late callbacks

    (async () => {
      /*  rear camera ---------------------------------------------------- */
      const stream = await getRearCameraStream();
      if (!mounted) return;
      console.log("PHONE → camera stream ready:", stream);
  
      videoRef.current.srcObject = stream;
      const track = stream.getVideoTracks()[0];
      setSelectedId(track.getSettings().deviceId || "");

      /* list all camera devices */
      const all = await navigator.mediaDevices.enumerateDevices();
      setCamChoices(all.filter(d => d.kind === "videoinput"));

      /* signalling channel -------------------------------------------- */
      sockRef.current = openSignallingSocket(handleSignal);

      /* when we learn our socket-ID, create the Peer ------------------- */

      const wait = setInterval(() => {
        const me = sockRef.current.peerId();
        if (!me) return;

        clearInterval(wait);
        peerRef.current = new Peer({
          initiator: true,
          stream,
          config: rtcConfig,
        });
        
        peerRef.current.on("signal", data => {

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

      }, 50);

    })();

    /*  cleanup on unmount / HMR ----------------------------------------- */
    return () => {

      mounted = false;
      peerRef.current?.destroy();
      sockRef.current?.send({ type: "hangup" });
      sockRef.current = null;
    };
  }, []);

  /* messages arriving from the viewer ------------------------------------- */
  function handleSignal(msg) {

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
        config: rtcConfig,
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



  /* open the requested camera device and return a MediaStream */
  async function openCamera(deviceId) {
    return navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } }   // no size hints at all
    });
  }

  function waitTrackEnded(track, timeout = 500) {
    console.log("Track ending:", track.label);
    return new Promise(res => {
      if (track.readyState === "ended") return res();          // already free

      const onEnded = () => {
        clearTimeout(timer);
        res();
      };
      track.addEventListener("ended", onEnded, { once: true });

      /* fallback: resolve anyway after 0.5 s */
      const timer = setTimeout(() => {
        track.removeEventListener("ended", onEnded);
        res();
      }, timeout);
    });
  }

  async function switchCam(e) {
    const deviceId = e.target.value;

    if (deviceId === selectedId) return;  

    /* 1. Drop the current peer so no track is pinned in WebRTC */
    peerRef.current?.destroy();
    peerRef.current = null;

    /* 2. Release the hardware completely */
    const oldStream = videoRef.current.srcObject;
    if (oldStream) {
      await Promise.all(oldStream.getTracks().map(t => waitTrackEnded(t)));
    }
    console.log("PHONE → camera tracks stopped");
    videoRef.current.srcObject = null;

    /* 3. Open the requested lens */

    let newStream;
    try {
      newStream = await openCamera(deviceId);
    } catch (err) {
      console.error("switchCam getUserMedia failed:", err);
      // fall back to the previous stream so the UI doesn’t go dark
      videoRef.current.srcObject = oldStream;
      return;
    }

    videoRef.current.srcObject = newStream;
    setSelectedId(deviceId);

    /* 4. Spin up a brand-new peer that streams the new track */
    const me = sockRef.current.peerId();          // we already have a socket
    remoteId.current = null;                      // force viewer to announce again

    peerRef.current = new Peer({ initiator: true, stream: newStream, config: rtcConfig });
    peerRef.current.on("signal", data =>
      sockRef.current.send({
        type: data.type ?? "candidate",
        target: null,                             // broadcast; viewer will respond
        from: me,
        data
      })
    );
    peerRef.current.on("iceStateChange", () =>
      console.log("PHONE ICE →", peerRef.current._pc.iceConnectionState)
    );
  }

  useEffect(() => {
    const stream = videoRef.current?.srcObject;
    if (!stream) return;                            // nothing to inspect yet

    const track = stream.getVideoTracks()[0];
    const caps  = track.getCapabilities?.() || {};

    if ('zoom' in caps) {
      const cur = track.getSettings().zoom ?? caps.zoom.min;
      setZoomInfo({ track, min: caps.zoom.min, max: caps.zoom.max,
                    step: caps.zoom.step ?? 1, cur });
    } else {
      setZoomInfo(null);                            // hide slider if unsupported
    }
  }, [videoRef.current?.srcObject]);    

  return (
    <div className="video-wrapper">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="stream-video"
      />
      <div className="controls-overlay">
        <select value={selectedId} onChange={switchCam}>
          {camChoices.map(d => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || "camera"}
            </option>
          ))}
        </select>

        {zoomInfo && (
          <div className="zoom-row">
            <span>{zoomInfo.min}×</span>
            <input
              type="range"
              min={zoomInfo.min}
              max={zoomInfo.max}
              step={zoomInfo.step}
              defaultValue={zoomInfo.cur}
              onChange={e =>
                zoomInfo.track.applyConstraints({ zoom: Number(e.target.value) })
              }
            />
            <span>{zoomInfo.max}×</span>
          </div>
        )}
      </div>
    </div>
  );
}
