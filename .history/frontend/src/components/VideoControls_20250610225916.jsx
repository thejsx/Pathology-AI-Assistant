// frontend/src/VideoPlayer.jsx
import React, { useState, useEffect } from "react";

export default function VideoPlayer({ streamRef }) {
  const [zoom, setZoom]       = useState(1);
  const [rotate, setRotate]   = useState(0);
  const [offset, setOffset]   = useState({ x: 0, y: 0 });

  // apply transforms to the <video> element
  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.style.transform = `
      translate(${offset.x}px, ${offset.y}px)
      rotate(${rotate}deg)
      scale(${zoom})
    `;
  }, [zoom, rotate, offset, streamRef]);

  /* simple UI — improve later */
  return (
    <div style={{ marginTop: "1rem" }}>
      <button onClick={() => setZoom(z => z * 1.1)}>Zoom +</button>
      <button onClick={() => setZoom(z => z / 1.1)}>Zoom –</button>
      <button onClick={() => setRotate(r => r + 90)}>Rotate ↻</button>
      <button onClick={() => setRotate(r => r - 90)}>Rotate ↺</button>
      <button onClick={() => setOffset({ x: 0, y: 0 })}>Center</button>
    </div>
  );
}
