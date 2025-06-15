import React, { useState, useEffect, useCallback } from 'react';
import SideBar from '../components/SideBar';
import '../styles/Viewer.css';

export default function ViewerLayout({ videoStream, videoControls }) {
    const [bottomBarHeight, setBottomBarHeight] = useState(250);

    const [isResizingBottomBar, setIsResizingBottomBar] = useState(false);


    const handleBottomBarResize = useCallback((e) => {
        if (isResizingBottomBar) {
            // Set new height based on mouse position from the top of the viewport
            const newHeight = Math.min(Math.max(window.innerHeight - e.clientY, 0), window.innerHeight / 2);
            setBottomBarHeight(newHeight);
        }
    }, [isResizingBottomBar]);

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
                <SideBar/>

                <div className="main-content">
                    <div className="stream-container">
                        {videoStream}
                        {videoControls}
                    </div>
                </div>
            </div>

            <div
                className="resizer-x"
                onMouseDown={() => setIsResizingBottomBar(true)}
            />

            <div className="bottom-bar" style={{ height: `${bottomBarHeight}px` }}>

            </div>
        </div>
    );
}