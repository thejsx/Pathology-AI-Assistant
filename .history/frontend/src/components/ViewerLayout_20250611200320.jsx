import React, { useState } from 'react';
import '../styles/Viewer.css';

export default function ViewerLayout({ videoStream, videoControls, sidebarContent, bottomBarContent }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [bottomBarCollapsed, setBottomBarCollapsed] = useState(false);

    return (
        <div className="viewer-container">
            <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                    {sidebarCollapsed ? '>' : '<'}
                </button>
                {!sidebarCollapsed && sidebarContent}
            </div>
            <div className="main-content">
                <div className="stream-container">
                    {videoStream}
                    {videoControls}
                </div>
                <div className={`bottom-bar ${bottomBarCollapsed ? 'collapsed' : ''}`}>
                    <button onClick={() => setBottomBarCollapsed(!bottomBarCollapsed)}>
                        {bottomBarCollapsed ? '^' : 'v'}
                    </button>
                    {!bottomBarCollapsed && bottomBarContent}
                </div>
            </div>
        </div>
    );
}