import React, { useState, useEffect, useCallback } from 'react';
import '../styles/Viewer.css';

export default function ViewerLayout({ videoStream, videoControls, sidebarContent, bottomBarContent }) {
    const [sidebarWidth, setSidebarWidth] = useState(250);
    const [bottomBarHeight, setBottomBarHeight] = useState(250);

    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [isResizingBottomBar, setIsResizingBottomBar] = useState(false);

    const handleSidebarResize = useCallback((e) => {
        if (isResizingSidebar) {
            // Set new width, but constrain it between 0 and 50% of the window width
            const newWidth = Math.min(Math.max(e.clientX, 0), window.innerWidth / 2);
            setSidebarWidth(newWidth);
        }
    }, [isResizingSidebar]);

    const handleBottomBarResize = useCallback((e) => {
        if (isResizingBottomBar) {
            // Set new height based on mouse position from the top of the viewport
            const newHeight = Math.min(Math.max(window.innerHeight - e.clientY, 0), window.innerHeight / 2);
            setBottomBarHeight(newHeight);
        }
    }, [isResizingBottomBar]);

    const stopResizing = useCallback(() => {
        setIsResizingSidebar(false);
        setIsResizingBottomBar(false);
    }, []);

    useEffect(() => {
        // Add and remove event listeners based on the resizing state
        if (isResizingSidebar || isResizingBottomBar) {
            window.addEventListener('mousemove', isResizingSidebar ? handleSidebarResize : handleBottomBarResize);
            window.addEventListener('mouseup', stopResizing);
        }

        // Cleanup function
        return () => {
            window.removeEventListener('mousemove', isResizingSidebar ? handleSidebarResize : handleBottomBarResize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizingSidebar, isResizingBottomBar, handleSidebarResize, handleBottomBarResize, stopResizing]);

    return (
        <div className="viewer-container">
            <div className="sidebar-main-container">
                <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
                    {/* Render content only if the sidebar is not fully collapsed */}
                    {sidebarWidth > 15 && sidebarContent}
                </div>
                
                <div
                    className="resizer-y"
                    onMouseDown={() => setIsResizingSidebar(true)}
                />

                <div className="main-content">
                    <div className="stream-container">
                        {videoStream}
                        {videoControls}
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
        </div>
    );
}