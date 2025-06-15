import React, { useState, useEffect, useCallback } from 'react';
import '../styles/BottomBar.css';

export default function BottomBarContent({bottomBarHeight}) {
    return (    
        <div className="bottom-bar" style={{ height: `${bottomBarHeight}px` }}>
            <div className="clinical-data-container">
                <h2>Clinical Data</h2>
            </div>
            <div className="resizer-y" />
            <div className="input-text-container">
                <h2>Input Text</h2>
                <textarea
                    className="input-text-area"
                    placeholder="Type here..."
                    rows={3}
                />
            </div>
            <div className='resizer-y' />
            <div className="llm-response-container">
                <h2>LLM Response</h2>
                <textarea
                    className="llm-response-area"
                    placeholder="Response will appear here..."
                    rows={3}
                    readOnly
                />
            </div>

        </div>
    );
}

