// very small wrapper ------------------------------------------------
export function openSignallingSocket(onMessage) {
    const ws = new WebSocket(`ws://${location.hostname}:8000/ws`);
    let myId = null;
  
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'id') {
        myId = msg.id;               // On first connect, we get our socket-ID
      } else {
        onMessage(msg);              // On subsequent connects, call the handler from Phone or Viewer
      }
    };
  
    function send(msg) {
      ws.readyState === 1 && ws.send(JSON.stringify(msg));
    }
    console.log("WebSocket opened", ws);
    return { send, myId };
  }
  