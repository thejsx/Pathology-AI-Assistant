import React, { useState, useEffect, useCallback } from 'react';
import '../styles/BottomBarContent.css';

export default function BottomBarContent() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [bottomBarHeight, setBottomBarHeight] = useState(250);

    const handleBottomBarResize = useCallback((e) => {
        if (isCollapsed) {
            // Set new height based on mouse position from the top of the viewport
            const newHeight = Math.min(Math.max(window.innerHeight - e.clientY, 0), window.innerHeight / 2);
            setBottomBarHeight(newHeight);
        }
    }, [isCollapsed]);

    const stopResizing = useCallback(() => {
        setIsCollapsed(false);
    }, []);