import React, { useState, useEffect } from 'react';

export default function VideoPlayer({ streamRef }) {
    const [zoom, setZoom] = useState(1);
    const [rotate, setRotate] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const applyTransform = () => {
        if (!streamRef.current) return;
        streamRef.current.style.transform = `
            translate(${offset.x}px, ${offset.y}px)
            rotate(${rotate}deg)
            scale(${zoom})
        `;
    };

    useEffect(() => {
        applyTransform();
    }, [zoom, rotate, offset, streamRef]);

    // Listen for fullscreen changes to reapply transforms
    useEffect(() => {
        const handleFullscreenChange = () => {
            // Small delay to ensure fullscreen transition is complete
            setTimeout(() => {
                applyTransform();
            }, 1000);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [zoom, rotate, offset]);

    const handleFullScreen = () => {
        if (streamRef.current) {
            streamRef.current.requestFullscreen()
                .then(() => {
                    // Reapply transforms after entering fullscreen
                    setTimeout(() => {
                        applyTransform();
                    }, 100);
                })
                .catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
        }
    };

    return (
        <div className="stream-controls">            
            <button onClick={() => {setZoom(1), setOffset({ x: 0, y: 0 }), setRotate(0)}}>RESET</button>
            <button onClick={() => setZoom(z => z * 1.1)}>Zoom +</button>
            <button onClick={() => setZoom(z => z / 1.1)}>Zoom –</button>
            <button onClick={() => setRotate(r => r + 10)}>Rotate +10°</button>
            <button onClick={() => setRotate(r => r - 10)}>Rotate -10°</button>
            <button onClick={() => setOffset({ x: offset.x + 10, y: offset.y })}>Right</button>
            <button onClick={() => setOffset({ x: offset.x - 10, y: offset.y })}>Left</button>
            <button onClick={() => setOffset({ x: offset.x, y: offset.y + 10 })}>Down</button>
            <button onClick={() => setOffset({ x: offset.x, y: offset.y - 10 })}>Up</button>

            <button onClick={handleFullScreen}>Fullscreen</button>
        </div>
    );
}