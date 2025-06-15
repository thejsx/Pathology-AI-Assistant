// very small wrapper ------------------------------------------------
export function openSignallingSocket(onMessage) {
    const ws = new WebSocket(`ws://${location.hostname}:8000/ws`);
    let myId = null;
    console.log('Attempting to connect to signalling server:');
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'id') {
        console.log("Signalling socket connected:", msg.id);
        myId = msg.id;               // On first connect, we get our socket-ID
      } else {
        console.log("Signalling msg:", msg);
        onMessage(msg);              // On subsequent connects, call the handler from Phone or Viewer
      }
    };
    console.log('After attempting to connect to signalling server:');
    function send(msg) {
      ws.readyState === 1 && ws.send(JSON.stringify(msg));
    }
    console.log('returning signalling socket:', { send, peerId: () => myId });
    return { send, peerId: () => myId };
  }
  