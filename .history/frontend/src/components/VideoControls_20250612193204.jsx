import React, { useState, useEffect } from 'react';

export default function VideoPlayer({ streamRef }) {
    const [zoom, setZoom] = useState(1);
    const [rotate, setRotate] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!streamRef.current) return;
        streamRef.current.style.transform = `
            translate(${offset.x}px, ${offset.y}px)
            rotate(${rotate}deg)
            scale(${zoom})
        `;
    }, [zoom, rotate, offset, streamRef]);

    const handleFullScreen = () => {
        if (streamRef.current) {
            streamRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        }
    };

    return (
        <div className="stream-controls">
            <button onClick={() => setZoom(z => z * 1.1)}>Zoom +</button>
            <button onClick={() => setZoom(z => z / 1.1)}>Zoom –</button>
            <button onClick={() => setRotate(r => r + 10)}>Rotate +10°</button>
            <button onClick={() => setRotate(r => r - 10)}>Rotate -10°</button>
            <button onClick={() => setOffset({ x: 0, y: 0 })}>Center</button>
            <button onClick={handleFullScreen}>Fullscreen</button>
        </div>
    );
}