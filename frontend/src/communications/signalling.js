// very small wrapper ------------------------------------------------
export function openSignallingSocket(onMessage) {
    const base = import.meta.env.VITE_WS_ORIGIN ?? "wss://localhost:8000";   // dev
    const ws = new WebSocket(`${base}/ws`);
    console.log('Connecting to signalling server:', ws.url);
    let myId = null;
    console.log('Attempting to connect to signalling server:');
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'id') {
        // console.log("Signalling socket connected:", msg.id);
        myId = msg.id;               // On first connect, we get our socket-ID
      } else {
        // console.log("Signalling msg:", msg);
        onMessage(msg);              // On subsequent connects, call the handler from Phone or Viewer
      }
    };

    function send(msg) {
      ws.readyState === 1 && ws.send(JSON.stringify(msg));
    }

    return { send, peerId: () => myId };
  }
  