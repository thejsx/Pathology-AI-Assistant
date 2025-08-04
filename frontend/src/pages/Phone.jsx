import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer/simplepeer.min.js";
import { openSignallingSocket } from "../communications/signalling";
import { getRearCameraStream } from "../utils/getRearStream";
import "../styles/Phone.css"; // Assuming you have a CSS file for styling

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

  async function switchCam(e) {
    const deviceId = e.target.value;
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } }
    });
    /* swap tracks locally */
    const oldTrack = videoRef.current.srcObject.getVideoTracks()[0];
    const newTrack = newStream.getVideoTracks()[0];
    videoRef.current.srcObject = newStream;

    /* tell simple-peer about the replacement */
    peerRef.current.replaceTrack(oldTrack, newTrack, videoRef.current.srcObject);
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
