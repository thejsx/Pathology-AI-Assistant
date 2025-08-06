import React, { useRef, useState, useEffect, useCallback } from 'react';
import useDraggable from '../hooks/useDraggable';
import CaptureImageButton from './CaptureImageButton';
import useGlobalStore from '../../GlobalStore';

export default function VideoControls({ streamRef }) {
    const {
        caseId,
        settings,  // Get the entire settings object
        updateSetting,
        resetSettingsToDefault,
    } = useGlobalStore();
    
    // Destructure individual settings for easier access
    const { zoom, rotate, offsetX, offsetY, flipX, videoControlsCollapsed, cropToVideo = false } = settings;
    const isCollapsed = videoControlsCollapsed;
    
    // draggable controls position for expanded state
    const controlsRef = useRef(null);
    const [controlsInitPos, setControlsInitPos] = useState({ x: 0, y: 0 });
    
    // draggable position for collapsed state
    const collapsedRef = useRef(null);
    const [collapsedInitPos, setCollapsedInitPos] = useState({ x: 0, y: 0 });
    const [collapsedKey, setCollapsedKey] = useState(0);
    
    useEffect(() => {
        const el = controlsRef.current;
        if (el) {
            setControlsInitPos({ x: window.innerWidth - el.offsetWidth - 10, y: 10 });
        }
        // Set initial position for collapsed button
        setCollapsedInitPos({ x: window.innerWidth - 60, y: 10 });
    }, []);
    
    // Track when collapse state changes to update key
    useEffect(() => {
        if (isCollapsed) {
            setCollapsedKey(prev => prev + 1);
        }
    }, [isCollapsed]);
    
    const controlsPos = useDraggable(controlsRef, controlsInitPos);
    const collapsedPos = useDraggable(collapsedRef, collapsedInitPos, collapsedKey);

    const applyTransform = useCallback(() => {
        const targetElement = streamRef.current;
        if (!targetElement) return;
        
        targetElement.style.transform = `
            translate(${offsetX}px, ${offsetY}px)
            rotate(${rotate}deg)
            scaleX(${flipX ? -1 : 1})
            scale(${zoom})
        `;
    }, [zoom, rotate, offsetX, offsetY, flipX, streamRef]);

    useEffect(() => {
        applyTransform();
    }, [zoom, rotate, offsetX, offsetY, flipX, streamRef, applyTransform]);

    const nudge = (key, delta) => {
        const currentValue = useGlobalStore.getState().settings[key];
        const newValue = Math.round((currentValue + delta)*10) / 10;
        updateSetting(key, newValue);
    };

    const handleFullscreenChange = useCallback(() => {
        setTimeout(() => {
            applyTransform();
        }, 100);
    }, [applyTransform]);

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [handleFullscreenChange]);

    const handleFullScreen = () => {
        const container = streamRef.current?.parentElement;
        if (container) {
            if (document.fullscreenElement === container) {
                document.exitFullscreen();
            } else {
                container.requestFullscreen({ navigationUI: 'hide' })
                    .then(() => {
                        setTimeout(() => {
                            applyTransform();
                        }, 100);
                    })
                    .catch(err => {
                        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                    });
            }
        }
    };

    return (
        <>
            {isCollapsed ? (
                <div
                    ref={collapsedRef}
                    className="stream-controls-collapsed-draggable"
                    style={{ 
                        position: 'fixed', 
                        top: collapsedPos.y, 
                        left: collapsedPos.x,
                        zIndex: 10 
                    }}
                >
                    <button
                        onClick={() => updateSetting('videoControlsCollapsed', false)}
                        title="Show controls"
                        className="expand-btn"
                    >
                        ☰
                    </button>
                </div>
            ) : (
                <div
                    ref={controlsRef}
                    style={{ 
                        position: 'fixed', 
                        top: controlsPos.y, 
                        left: controlsPos.x, 
                        right: 'auto', 
                        zIndex: 10 
                    }}
                >
                    <div className="stream-controls-modern">
                        <div className="controls-header">
                            <span className="controls-title">Video Controls</span>
                            <button
                                onClick={() => updateSetting('videoControlsCollapsed', true)}
                                className="collapse-btn"
                                title="Hide controls"
                            >
                                ×
                            </button>
                        </div>
                        
                        {/* Main Actions */}
                        <div className="controls-section">
                            <div className="control-group-title">Actions</div>
                            <CaptureImageButton streamRef={streamRef} />
                            <button 
                                className="control-btn primary"
                                onClick={handleFullScreen}
                            >
                                🔳 Fullscreen
                            </button>
                            <button 
                                className="control-btn"
                                onClick={resetSettingsToDefault}
                            >
                                ↺ Reset All
                            </button>
                        </div>

                        {/* Capture Options */}
                        <div className="controls-section">
                            <div className="control-group-title">Capture Options</div>
                            <label className="toggle-control">
                                <input
                                    type="checkbox"
                                    checked={settings.cropToVideo || false}
                                    onChange={(e) => updateSetting('cropToVideo', e.target.checked)}
                                />
                                <span className="toggle-label">Crop to Video</span>
                            </label>
                            <div className="control-hint">
                                {settings.cropToVideo ? '✓ Capturing video only' : '□ Capturing full frame'}
                            </div>
                            
                            <label className="toggle-control" style={{ marginTop: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={settings.autoSelectCaptured || false}
                                    onChange={(e) => updateSetting('autoSelectCaptured', e.target.checked)}
                                />
                                <span className="toggle-label">Auto-select Images</span>
                            </label>
                            <div className="control-hint">
                                {settings.autoSelectCaptured ? '✓ Images selected on capture' : '□ Manual selection required'}
                            </div>
                        </div>

                        {/* Transform Controls */}
                        <div className="controls-section">
                            <div className="control-group-title">Transform</div>
                            
                            {/* Zoom */}
                            <div className="control-row">
                                <span className="control-label">Zoom</span>
                                <div className="button-group">
                                    <button 
                                        className="control-btn small"
                                        onClick={() => nudge('zoom', -0.1)}
                                        title="Zoom out"
                                    >
                                        −
                                    </button>
                                    <span className="control-value">{zoom.toFixed(1)}×</span>
                                    <button 
                                        className="control-btn small"
                                        onClick={() => nudge('zoom', 0.1)}
                                        title="Zoom in"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Rotation */}
                            <div className="control-row">
                                <span className="control-label">Rotate</span>
                                <div className="button-group">
                                    <button 
                                        className="control-btn small"
                                        onClick={() => nudge('rotate', -10)}
                                        title="Rotate left"
                                    >
                                        ↺
                                    </button>
                                    <span className="control-value">{rotate}°</span>
                                    <button 
                                        className="control-btn small"
                                        onClick={() => nudge('rotate', 10)}
                                        title="Rotate right"
                                    >
                                        ↻
                                    </button>
                                </div>
                            </div>

                            {/* Position */}
                            <div className="control-row">
                                <span className="control-label">Position</span>
                                <div className="position-grid">
                                    <button 
                                        className="control-btn small"
                                        onClick={() => nudge('offsetY', -10)}
                                        title="Move up"
                                    >
                                        ↑
                                    </button>
                                    <button 
                                        className="control-btn small"
                                        onClick={() => nudge('offsetX', -10)}
                                        title="Move left"
                                    >
                                        ←
                                    </button>
                                    <button 
                                        className="control-btn small center"
                                        onClick={() => {
                                            updateSetting('offsetX', 0);
                                            updateSetting('offsetY', 0);
                                        }}
                                        title="Center"
                                    >
                                        ⊙
                                    </button>
                                    <button 
                                        className="control-btn small"
                                        onClick={() => nudge('offsetX', 10)}
                                        title="Move right"
                                    >
                                        →
                                    </button>
                                    <button 
                                        className="control-btn small"
                                        onClick={() => nudge('offsetY', 10)}
                                        title="Move down"
                                    >
                                        ↓
                                    </button>
                                </div>
                            </div>

                            {/* Flip */}
                            <button 
                                className={`control-btn ${flipX ? 'active' : ''}`}
                                onClick={() => updateSetting('flipX', !flipX)}
                            >
                                ⇄ Flip Horizontal {flipX ? '(On)' : '(Off)'}
                            </button>
                        </div>
                    </div>
                </div> 
            )}
        </>
    );
}