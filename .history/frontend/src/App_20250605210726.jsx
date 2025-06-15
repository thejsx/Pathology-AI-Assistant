import React, { useEffect, useRef, useState } from "react";

function App() {
  const wsRef = useRef(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Connect to the FastAPI WebSocket
    wsRef.current = new WebSocket(`ws://${location.host.replace("3000", "8000")}/ws`);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data.text]);   // display any message we receive
    };

    return () => wsRef.current.close();
  }, []);

  // Send a hard-coded ping every 3 s
  useEffect(() => {
    const id = setInterval(() => {
      if (wsRef.current?.readyState === 1) {
        wsRef.current.send(JSON.stringify({ text: "hello from " + navigator.userAgent }));
      }
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{fontFamily:"sans-serif",padding:"1rem"}}>
      <h1>Microscope App – connectivity test</h1>
      <p>If everything works, new lines will keep appearing below:</p>
      <pre>
        {messages.map((m, i) => (
          <div key={i}>{m}</div>
        ))}
      </pre>
    </div>
  );
}

export default App;
