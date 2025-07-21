import React, { useState, useEffect, useCallback } from 'react';
import SideBar from './SideBar';
import BottomBar from './BottomBar';
import useGlobalStore from '../../GlobalStore';
import '../styles/Viewer.css';


export default function ViewerLayout({ videoStream, videoControls, streamRef }) {
    const [isResizingBottomBar, setIsResizingBottomBar] = useState(false);
    const [mouseStartY, setMouseStartY] = useState(0);
    const { settings, updateSetting, fetchUserSettings, fetchLatestCase, fetchClinicalData, caseId, user } = useGlobalStore();
    const bottomBarHeight = settings.bottomBarHeight || 250; // Default height if not set

    // Fetch user settings once on mount
    useEffect(()=> {
        console.log('Fetching user settings on mount');
        fetchUserSettings().catch((error) => {
            console.error('Error fetching user settings:', error);
        });
    }, [user]);

    useEffect(() => {
        console.log('Fetching latest case on mount');
        fetchLatestCase();
    }, []);

    // Fetch clinical data once on mount
    useEffect(() => {
        if (caseId) {
            console.log('Fetching clinical data on mount for caseId:', caseId);
            fetchClinicalData().catch((error) => {
                console.error('Error fetching clinical data:', error);
            });
        }
    }, [caseId]);

    const handleBottomBarResize = useCallback((e) => {
        if (isResizingBottomBar) {
            // Set new height based on mouse position from the top of the viewport
            const mouseDeltaY = e.clientY - mouseStartY;
            const newHeight = Math.min(Math.max(bottomBarHeight - mouseDeltaY, 0), window.innerHeight * 0.8); // Limit height to a maximum of 80% of the viewport height
            updateSetting('bottomBarHeight', newHeight);
        }
    }, [isResizingBottomBar, updateSetting]);

    const startResizing = useCallback((event) => {
        event.preventDefault();
        setIsResizingBottomBar(true);
        setMouseStartY(event.clientY);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizingBottomBar(false);
    }, []);

    useEffect(() => {
        // Add and remove event listeners based on the resizing state
        if (isResizingBottomBar) {
            window.addEventListener('mousemove', handleBottomBarResize);
            window.addEventListener('mouseup', stopResizing);
        }

        // Cleanup function
        return () => {
            window.removeEventListener('mousemove', handleBottomBarResize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizingBottomBar, handleBottomBarResize, stopResizing]);

    return (
        <div className="viewer-container">
            <div className="sidebar-main-container">
                <SideBar streamRef={streamRef}/>

                <div className="main-content">
                    <div className="stream-container">
                        {videoStream}
                        {videoControls}
                    </div>
                </div>
            </div>

            <div
                className="resizer-x"
                onMouseDown={(event) => {startResizing(event)}}
            />

            <BottomBar
                bottomBarHeight={bottomBarHeight}
            />


        </div>
    );
}