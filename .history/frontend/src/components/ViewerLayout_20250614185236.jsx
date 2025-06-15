import React, { useState, useEffect, useCallback } from 'react';
import '../styles/Viewer.css'; '../styles/SideBar.css';

export default function ViewerLayout({ videoStream, videoControls, sidebarContent, bottomBarContent }) {

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
                <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
                    {/* Render content only if the sidebar is not fully collapsed */}
                    {sidebarWidth > 15 && sidebarContent}
                </div>

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
                {/* Render content only if the bar is not fully collapsed */}
                {bottomBarHeight > 15 && bottomBarContent}
            </div>
        </div>
    );
}