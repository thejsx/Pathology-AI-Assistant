import React, { useState, useEffect, useCallback } from 'react';
import '../styles/SideBar.css';

export default function SideBar({ children }) {
    return (
        <div className="sidebar">
            <div className="sidebar-content">
                {children}
            </div>
        </div>
    );
}