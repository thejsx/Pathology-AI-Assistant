import React, { useRef, useState, useEffect, useCallback } from 'react';
import useDraggable from '../hooks/useDraggable';
import { useContext } from 'react';
import CaptureImageButton from './CaptureImageButton';
import useGlobalStore from '../../GlobalStore';

export default function VideoControls({ streamRef }) {

    const {
        caseId,
        settings: { zoom, rotate, offsetX, offsetY, flipX, videoControlsCollapsed },
        updateSetting,
        resetSettingsToDefault,
    } = useGlobalStore();
    const isCollapsed = videoControlsCollapsed;
    // draggable controls position
    const controlsRef = useRef(null);
    const [controlsInitPos, setControlsInitPos] = useState({ x: 0, y: 0 });
    useEffect(() => {
        const el = controlsRef.current;
        if (el) {
            setControlsInitPos({ x: window.innerWidth - el.offsetWidth - 10, y: 10 });
        }
    }, []);
    const controlsPos = useDraggable(controlsRef, controlsInitPos);

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



    return (
        <div
            ref={controlsRef}
            style={{ position: 'fixed', top: controlsPos.y, left: controlsPos.x, right: 'auto', zIndex: 10 }}
        >
            {/* Collapsed / Expanded controls */}
            {isCollapsed ? (
                <div className="stream-controls-expand">
                    <button
                        onClick={() => updateSetting('videoControlsCollapsed', false)}
                        title="Show controls"
                        className="expand-btn"
                    >
                        ☰
                    </button>
                </div>
            ) : (
                <div className="stream-controls">
                    <div className="controls-header">
                        <span className="controls-title">Controls</span>
                        <button
                            onClick={() => updateSetting('videoControlsCollapsed', true)}
                            className="collapse-btn"
                            title="Hide controls"
                        >
                            ×
                        </button>
                    </div>
                    <CaptureImageButton streamRef={streamRef} />
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
        </div>
    );
}