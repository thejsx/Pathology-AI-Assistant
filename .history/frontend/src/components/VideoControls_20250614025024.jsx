import React, { useState, useEffect } from 'react';

export default function VideoPlayer({ streamRef }) {
    const [zoom, setZoom] = useState(1);
    const [rotate, setRotate] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [flipX, setFlipX] = useState(false);

    const applyTransform = () => {
        if (!streamRef) return;
        const transformValue = `
            translate(${offset.x}px, ${offset.y}px)
            rotate(${rotate}deg)
            scale(${zoom})
            scaleX(${flipX ? -1 : 1})
        `;
        streamRef.current.style.transform = transformValue;
        if (document.fullscreenElement) {
            streamRef.current.style.position = 'absolute';
            streamRef.current.style.top = '50%';
            streamRef.current.style.left = '50%';
            streamRef.current.style.width = '100%';
            streamRef.current.style.height = '100%';
            streamRef.current.style.objectFit = 'contain';
            // Apply transform with centering adjustment
            streamRef.current.style.transform = `translate(-50%, -50%) ${transformValue}`;
        } else {
            // Reset positioning when not in fullscreen
            streamRef.current.style.position = '';
            streamRef.current.style.top = '';
            streamRef.current.style.left = '';
            streamRef.current.style.transform = transformValue;
        }

    };

    useEffect(() => {
        applyTransform();
    }, [zoom, rotate, offset, flipX, streamRef]);

    // Listen for fullscreen changes to reapply transforms
    useEffect(() => {
        const handleFullscreenChange = () => {
            // Small delay to ensure fullscreen transition is complete
            setTimeout(() => {
                applyTransform();
            }, 100);
        };

        document.addEventListener('fullscreenchange', () => {
            handleFullscreenChange();
            console.log('Fullscreen change detected:', document.fullscreenElement ? 'Entered' : 'Exited');
            }
        );
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [zoom, rotate, offset, flipX]);

    const handleFullScreen = () => {
        if (streamRef.current) {
            const videoContainer = streamRef.current.parentElement;
            const elementToFullscreen = videoContainer || streamRef.current;
            elementToFullscreen.current.requestFullscreen()
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
            <button onClick={() => {setZoom(1), setOffset({ x: 0, y: 0 }), setRotate(0), setFlipX(false)}}>RESET</button>
            <button onClick={() => setZoom(z => z * 1.1)}>Zoom +</button>
            <button onClick={() => setZoom(z => z / 1.1)}>Zoom –</button>
            <button onClick={() => setRotate(r => r + 10)}>Rotate +10°</button>
            <button onClick={() => setRotate(r => r - 10)}>Rotate -10°</button>
            <button onClick={() => setOffset({ x: offset.x + 10, y: offset.y })}>Right</button>
            <button onClick={() => setOffset({ x: offset.x - 10, y: offset.y })}>Left</button>
            <button onClick={() => setOffset({ x: offset.x, y: offset.y + 10 })}>Down</button>
            <button onClick={() => setOffset({ x: offset.x, y: offset.y - 10 })}>Up</button>
            <button onClick={() => setFlipX(f => !f)}>Invert X</button>

            <button onClick={handleFullScreen}>Fullscreen</button>
        </div>
    );
}