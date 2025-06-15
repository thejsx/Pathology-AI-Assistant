import React, { useState, useEffect, useCallback } from 'react';
import '../styles/SideBar.css';

export default function SideBar({  }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(100);


    return (
        <div className="sidebar">
            <div className="sidebar-content">
                {children}
            </div>
        </div>
    );
}