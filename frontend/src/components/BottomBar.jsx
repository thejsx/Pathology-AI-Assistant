import React, { useState, useEffect, useCallback } from 'react';
import '../styles/BottomBar.css';
import {processImages} from '../communications/mainServerAPI.js' 
import useGlobalStore from '../../GlobalStore';

export default function BottomBarContent({bottomBarHeight}) {
    const [textValue, setTextValue] = useState('');
    const { selectedImages, caseId } = useGlobalStore();
    const [llmResponse, setLlmResponse] = useState('No query currently made.');
    const [useImagesChecked, setUseImagesChecked] = useState(selectedImages.length > 0);
    const [clinDataWidth, setClinDataWidth] = useState('30vw'); 
    const [inputTextWidth, setInputTextWidth] = useState('35vw');
    const [llmResponseWidth, setLlmResponseWidth] = useState('35vw');
    const [isResizingX, setIsResizingX] = useState(false);
    const [mouseStartX, setMouseStartX] = useState(0);
    const [yResizerPosition, setYResizerPosition] = useState();


    const startResizingX = useCallback((event) => {
        event.preventDefault();
        setIsResizingX(true);
        setMouseStartX(event.clientX);
    }, []);

    const stopResizingX = useCallback(() => {
        setIsResizingX(false);
    }, []);

    const handleResizingX = useCallback((e) => {
        if (isResizingX) {

            if (e.clientX > 0 && e.clientX < window.innerWidth) {
                const llmRW = llmResponseWidth.endsWith('vw') ? parseInt(llmResponseWidth)*window.innerWidth/100 : parseInt(llmResponseWidth);
                const cDW = clinDataWidth.endsWith('vw') ? parseInt(clinDataWidth)*window.innerWidth/100 : parseInt(clinDataWidth);
                const iTW = inputTextWidth.endsWith('vw') ? parseInt(inputTextWidth)*window.innerWidth/100 : parseInt(inputTextWidth);

                const mouseDeltaX = e.clientX - mouseStartX;
                if (yResizerPosition === 'left') {
                    // Resizing left side

                    const newClinDataWidth = Math.max(0, cDW + mouseDeltaX) + 'px';
                    const newInputTextWidth = window.innerWidth - parseInt(newClinDataWidth) - llmRW + 'px';
                    setClinDataWidth(newClinDataWidth);
                    setInputTextWidth(newInputTextWidth);

                } else if (yResizerPosition === 'right') {
                    // Resizing right side
                    const newInputTextWidth = Math.max(0, iTW + mouseDeltaX) + 'px';
                    const newLlmResponseWidth =  window.innerWidth - cDW - parseInt(newInputTextWidth) + 'px';

                    setInputTextWidth(newInputTextWidth);  
                    setLlmResponseWidth(newLlmResponseWidth);

                }
            }
        }
    }, [isResizingX]);

    useEffect(() => {
        if (isResizingX) {
            window.addEventListener('mousemove', handleResizingX);
            window.addEventListener('mouseup', stopResizingX);
        }
        return () => {
            window.removeEventListener('mousemove', handleResizingX);
            window.removeEventListener('mouseup', stopResizingX);
        };
    }, [isResizingX, handleResizingX, stopResizingX]);


    const llmCall = async (textValue) => {
        console.log('LLM Call with text:', textValue);
        if (textValue.trim() === '') {
            setLlmResponse('Please enter a query before processing.');
            return;
        }
        if (!useImagesChecked && selectedImages.length === 0) {
            setLlmResponse('No images selected. Please select images to use with the query or click the "Send message without images" checkbox.');
            return;
        }
        if (!useImagesChecked && selectedImages.length > 0) {
            setLlmResponse('Images selected but "Use selected images" checkbox is unchecked. Please check the box to use images with the query or unselect images.');
            return;
        }
        setLlmResponse('Processing query and images...');
        const response = await processImages(caseId, selectedImages, textValue);
        console.log('LLM Response:', response['response']);
        // if (!response.ok) {
        //     throw new Error(`HTTP error! status: ${response.status}`);
        // }
        setLlmResponse(response['response']);
    }

    const handleUseImagesCheck = (event) => {
        setUseImagesChecked(event.target.checked);
    }

    useEffect(() => {
        // Update the checkbox state based on selected images
        setUseImagesChecked(selectedImages.length > 0);
    }, [selectedImages]);

    return (    
        <div className="bottom-bar" style={{ height: `${bottomBarHeight}px` }}>
            <div className="clinical-data-container"  style={{ width: clinDataWidth }}>
                <h2>Clinical Data</h2>
            </div>

            <div 
                className="resizer-y"
                onMouseDown={(event) => {startResizingX(event); setYResizerPosition('left');}}
            />
            
            <div className="input-text-container"  style={{ width: inputTextWidth }}>
                <h2>Input Text</h2>
                <textarea
                    value={textValue}
                    onChange={(e) => {
                        setTextValue(e.target.value);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.shiftKey) {
                            // Allow new line with Shift + Enter
                            return;
                        } else if (e.key === 'Enter') {
                            // Call LLM on Enter key press
                            e.preventDefault();
                            llmCall(textValue);
                        }
                    }}
                    className="input-text-area"
                    placeholder="Type here..."
                    rows={3}
                />
                <div className="input-text-modifiers">
                    <input
                        type="checkbox"
                        id="use-images-checkbox"
                        checked={useImagesChecked}
                        onChange={handleUseImagesCheck}
                        
                        >
                    </input>        
                    <label htmlFor="use-images-checkbox">
                        {selectedImages.length > 0 ? `Use selected images (${selectedImages.length})`  : 'Send message without images'}
                    </label>
                    
                </div>
            </div>

            <div 
                className='resizer-y'
                onMouseDown={(event) => {startResizingX(event); setYResizerPosition('right');}}
                 />

            <div className="llm-response-container"  style={{ width: llmResponseWidth }}>
                <h2>LLM Response</h2>
                <div className="output-response-area">
                    <div     className="output-response-text">
                        {llmResponse}
                    </div>
                </div>
                <div className="llm-button-container">
                    <button
                        className="llm-clear-button"
                        onClick={() => {
                            setTextValue('');
                            setLlmResponse('No query currently made.');
                        }}                        >
                            Clear
                    </button>
                    <button
                        className="llm-copy-button"
                        onClick={() => {
                            navigator.clipboard.writeText(llmResponse);
                        }}>
                            Copy
                    </button>
                </div>

            </div>

        </div>
    );
}

