import React, { useState, useEffect, useCallback } from 'react';
import { captureImage } from '../communications/mainServerAPI';

export default function VideoControls({ streamRef }) {
    const [zoom, setZoom] = useState(1);
    const [rotate, setRotate] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [flipX, setFlipX] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const applyTransform = () => {
        const targetElement = streamRef.current;
        if (!targetElement) return;
        
        targetElement.style.transform = `
            translate(${offset.x}px, ${offset.y}px)
            rotate(${rotate}deg)
            scaleX(${flipX ? -1 : 1})
            scale(${zoom})
        `;
    };

    useEffect(() => {
        applyTransform();
    }, [zoom, rotate, offset, flipX, streamRef]);

    const handleFullscreenChange = useCallback(() => {
        // Small delay to ensure fullscreen transition is complete
        setTimeout(() => {
            applyTransform();
        }, 100);
    }, [applyTransform]);


    // Listen for fullscreen changes to reapply transforms
    useEffect(() => {
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [handleFullscreenChange]);

    const handleFullScreen = () => {
        const container = streamRef.current?.parentElement;
        if (container) {
            // Check if the container is already in fullscreen
            if (document.fullscreenElement === container) {
                // Exit fullscreen
                document.exitFullscreen();
            }
            // Otherwise, enter fullscreen
            else {
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
        }
    };

    const imageCapture = async () => {
        const videoElement = streamRef.current;
        if (!videoElement) return;

    
        try {
            // Create canvas to capture video frame
            const imgCanvas = document.createElement('canvas');
            const ctx = imgCanvas.getContext('2d');

            const cssWidth = videoElement.clientWidth;
            const cssHeight = videoElement.clientHeight;

            const dpr  = window.devicePixelRatio || 1;
            
            imgCanvas.width  = cssWidth  * dpr;
            imgCanvas.height = cssHeight * dpr;
            ctx.scale(dpr, dpr);            // map back to CSS pixels
            
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, cssWidth, cssHeight);
            
            // object-fit: contain   ➜   same algo the browser uses
            const scale = Math.min(cssWidth / videoElement.videoWidth,
                cssHeight / videoElement.videoHeight);
            const drawW = videoElement.videoWidth  * scale;
            const drawH = videoElement.videoHeight * scale;
            
            ctx.save();
            // centre the frame
            ctx.translate(cssWidth / 2, cssHeight / 2);
            ctx.translate(offset.x, offset.y);
            ctx.rotate(rotate * Math.PI / 180);
                   
            ctx.scale(flipX ? -zoom :  zoom, zoom);
            
            ctx.drawImage(videoElement, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();
    

            // Convert final canvas to base64
            const dataURL = imgCanvas.toDataURL('image/png');

            // Send to main server
            const result = await captureImage(dataURL, 'current_case_id');
            console.log('Image captured and sent:', result);
            
            // Optional: Still open in new tab for preview
            const blob = await new Promise(resolve => imgCanvas.toBlob(resolve, 'image/png'));
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            
        } catch (error) {
            console.error('Error capturing image:', error);
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
                context.restore();        ☰
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
                    <button onClick={imageCapture}>Capture Image</button>
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