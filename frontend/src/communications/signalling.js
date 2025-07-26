// very small wrapper ------------------------------------------------
export function openSignallingSocket(onMessage) {
    const socket = new WebSocket(import.meta.env.VITE_WS_ORIGIN ?? "wss://localhost:8000/ws");
    console.log('Connecting to signalling server:', socket.url);
    let myId = null;
    console.log('Attempting to connect to signalling server:');
    socket.onmessage = (ev) => {
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
  