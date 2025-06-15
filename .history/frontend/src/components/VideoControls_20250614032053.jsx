import React, { useState, useEffect } from 'react';

export default function VideoControls({ streamRef }) {
    const [zoom, setZoom] = useState(1);
    const [rotate, setRotate] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [flipX, setFlipX] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const applyTransform = () => {
        const targetElement = document.fullscreenElement || streamRef.current;
        if (!targetElement) return;
        
        targetElement.style.transform = `
            translate(${offset.x}px, ${offset.y}px)
            rotate(${rotate}deg)
            scale(${zoom})
            scaleX(${flipX ? -1 : 1})
        `;
    };

    useEffect(() => {
        applyTransform();
    }, [zoom, rotate, offset, flipX]);

    // Listen for fullscreen changes to reapply transforms
    useEffect(() => {
        const handleFullscreenChange = () => {
            // Small delay to ensure fullscreen transition is complete
            setTimeout(() => {
                applyTransform();
            }, 100);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [handleFullscreenChange]);

    const handleFullScreen = () => {
        const container = streamRef.current?.parentElement;
        if (container) {
            container.requestFullscreen({ navigationUI: 'hide' })
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
        <>
            {/* Collapsed state - show expand button */}
            {isCollapsed && (
                <div className="stream-controls-expand">
                    <button 
                        onClick={() => setIsCollapsed(false)}
                        title="Show controls"
                        className="expand-btn"
                    >
                        ☰
                    </button>
                </div>
            )}

            {/* Expanded state - show all controls */}
            {!isCollapsed && (
                <div className="stream-controls">
                    <div className="controls-header">
                        <span className="controls-title">Controls</span>
                        <button 
                            onClick={() => setIsCollapsed(true)}
                            className="collapse-btn"
                            title="Hide controls"
                        >
                            ×
                        </button>
                    </div>
                    <button onClick={() => {setZoom(1); setOffset({ x: 0, y: 0 }); setRotate(0); setFlipX(false);}}>RESET</button>
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
            )}
        </>
    );
}