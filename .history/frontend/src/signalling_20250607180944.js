// very small wrapper ------------------------------------------------
export function openSignallingSocket(onMessage) {
    const ws = new WebSocket(`ws://${location.hostname}:8000/ws`);
    let myId = null;
  
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'id') {
        myId = msg.id;               // remember self
      } else {
        onMessage(msg);              // let React component handle
      }
    };
  
    function send(msg) {
      ws.readyState === 1 && ws.send(JSON.stringify(msg));
    }
  
    return { send, peerId: () => myId };
  }
  