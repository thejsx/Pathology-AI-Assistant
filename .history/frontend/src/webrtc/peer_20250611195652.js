import Peer from "simple-peer/simplepeer.min.js";

/**
 * Thin wrapper so the rest of the app never talks
 * directly to `simple-peer`.
 */
export default class WebRTCPeer {
  constructor({ initiator, stream, onSignal, onStream }) {
    this._peer = new Peer({
      initiator,
      stream,
      config: { iceServers: [], iceCandidatePoolSize: 0 }
    });

    this._peer.on("signal", onSignal);
    onStream && this._peer.on("stream", onStream);
    this._peer.on("iceStateChange", () =>
      console.debug("ICE →", this._peer._pc.iceConnectionState)
    );
  }

  signal(data)   { this._peer.signal(data); }
  destroy()      { this._peer.destroy(); }
  get stream()   { return this._peer._remoteStreams[0]; }
  get connected() { return this._peer.connected; }
}