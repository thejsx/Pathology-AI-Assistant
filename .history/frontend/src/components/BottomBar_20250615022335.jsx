import React, { useState, useEffect, useCallback } from 'react';
import '../styles/BottomBar.css';

export default function BottomBarContent({bottomBarHeight}) {
    return (    
        <div className="bottom-bar" style={{ height: `${bottomBarHeight}px` }}></div>
    );
}

