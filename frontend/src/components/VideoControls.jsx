import React, { useState, useEffect, useCallback } from 'react';
import { captureImage } from '../communications/mainServerAPI';
import { useContext } from 'react';
import useGlobalStore from '../../GlobalStore';

export default function VideoControls({ streamRef }) {

    const [isCollapsed, setIsCollapsed] = useState(false);
    const { 
        caseId,
        settings: { zoom, rotate, offsetX, offsetY, flipX },
        updateSetting,
        resetSettingsToDefault,
     } = useGlobalStore();

    const applyTransform = () => {
        const targetElement = streamRef.current;
        if (!targetElement) return;
        
        targetElement.style.transform = `
            translate(${offsetX}px, ${offsetY}px)
            rotate(${rotate}deg)
            scaleX(${flipX ? -1 : 1})
            scale(${zoom})
        `;
    };

    useEffect(() => {
        applyTransform();
    }, [zoom, rotate, offsetX, offsetY, flipX, streamRef]);

    const nudge = (key, delta) => {
        const currentValue = useGlobalStore.getState().settings[key];
        const newValue = Math.round((currentValue + delta)*10) / 10; // round to 1 decimal place
        updateSetting(key, newValue);
    };

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
            ctx.translate(offsetX, offsetY);
            ctx.rotate(rotate * Math.PI / 180);
                   
            ctx.scale(flipX ? -zoom :  zoom, zoom);
            
            ctx.drawImage(videoElement, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();
    

            // Convert final canvas to base64
            const dataURL = imgCanvas.toDataURL('image/png');

            // Send to main server
            const result = await captureImage(dataURL, caseId);
            console.log('Image captured and sent:', result);
            
            const filename = result.image_path.split(/[/\\]/).pop();
            window.dispatchEvent(new CustomEvent('imageCaptured', { detail: { filename } }));
            
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
                    <button onClick={imageCapture}>Capture Image</button>
                    <button onClick={resetSettingsToDefault}>Reset to Default</button>

                    <button onClick={() => nudge('zoom', zoom * 0.1)}>Zoom +</button>
                    <button onClick={() => nudge('zoom', zoom * -0.1)}>Zoom –</button>
                    <button onClick={() => nudge('rotate', 10)}>Rotate +10°</button>
                    <button onClick={() => nudge('rotate', -10)}>Rotate -10°</button>
                    <button onClick={() => nudge('offsetX', 10)}>Right</button>
                    <button onClick={() => nudge('offsetX', -10)}>Left</button>
                    <button onClick={() => nudge('offsetY', 10)}>Down</button>
                    <button onClick={() => nudge('offsetY', -10)}>Up</button>
                    <button onClick={() => updateSetting('flipX', !flipX)}>Invert X</button>                     

                    <button onClick={handleFullScreen}>Fullscreen</button>
                </div>
            )}
        </>
    );
}