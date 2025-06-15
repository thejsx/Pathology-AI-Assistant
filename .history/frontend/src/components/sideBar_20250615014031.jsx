import React, { useState, useEffect, useCallback } from 'react';
import '../styles/SideBar.css';

export default function SideBar() {
    const [isCollapsed, setIsCollapsed] = useState(false);



    return (
        {!isCollapsed && (
            <div className="sidebar">
                <div className="sidebar-header">
                    <span className="sidebar-title">Options</span>
                    <button 
                        className="collapse-btn"
                        onClick={() => setIsCollapsed(true)}
                        title="Collapse sidebar"
                    >
                        ×
                    </button>
                </div>

            </div>
        )}
    );
}