import React, { useState, useEffect, useCallback } from 'react';
import '../styles/BottomBar.css';
import {processLlmQuery, cancelLLMQuery, appendLlmHistory, updateClinicalFields, getClinicalData} from '../communications/mainServerAPI.js' 
import useGlobalStore from '../../GlobalStore';
import ClinicalDataModal from './ClinicalDataModal.jsx';
import HistoryModal from './HistoryModal';

export default function BottomBarContent({bottomBarHeight}) {
    const { settings, clinSettings, updateSetting, selectedImages, caseId, includeUserLLM, fetchHistory, setClinicalFieldValue } = useGlobalStore();
    const clinDataWidth = settings.bottomBarClinDataWidth || '30vw';
    const inputTextWidth = settings.bottomBarInputTextWidth || '35vw'; 
    const llmResponseWidth = settings.bottomBarLlmResponseWidth || '35vw';

    const [textValue, setTextValue] = useState(settings.defaultPrompt || '');
    const [llmResponse, setLlmResponse] = useState('No query currently made.');
    const [useImagesChecked, setUseImagesChecked] = useState(selectedImages.length > 0);
    const [useClinicalChecked, setUseClinicalChecked] = useState(settings.includeClinicalData);

    const [showClinicalData, setShowClinicalData] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

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
                    updateSetting('bottomBarClinDataWidth', newClinDataWidth);
                    updateSetting('bottomBarInputTextWidth', newInputTextWidth);

                } else if (yResizerPosition === 'right') {
                    // Resizing right side
                    const newInputTextWidth = Math.max(0, iTW + mouseDeltaX) + 'px';
                    const newLlmResponseWidth =  window.innerWidth - cDW - parseInt(newInputTextWidth) + 'px';

                    updateSetting('bottomBarInputTextWidth', newInputTextWidth);
                    updateSetting('bottomBarLlmResponseWidth', newLlmResponseWidth);

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
        setLlmResponse('Processing images and/or query...');

        const currentPrompt = textValue.trim();
        let clinicalData = null;
        if (settings.includeClinicalData) {
            if (settings.includeClinSummaryOnly) {
            clinicalData = clinSettings.summary.value;     // string
            } else if (settings.includeAllClinicalData) {
            clinicalData = {                              // object
                summary:    clinSettings.summary.value,
                procedure:  clinSettings.procedure.value,
                pathology:  clinSettings.pathology.value,
                imaging:    clinSettings.imaging.value,
                labs:       clinSettings.labs.value,
                specimen:   clinSettings.specimen.value     
            };}
        }

        const response = await processLlmQuery(
            caseId,
            selectedImages,
            currentPrompt,
            settings.reasoningEffort,
            settings.maxTokens? settings.maxTokens : 0,
            settings.includeHistory,
            includeUserLLM,
            clinicalData
        );
        console.log('LLM Response:', response['response']);
        appendLlmHistory(caseId, currentPrompt, response['response'], selectedImages.length)
        setLlmResponse(response['response']);
        await fetchHistory();  // Refresh history after appending
    }

    const handleUseImagesCheck = (event) => {
        setUseImagesChecked(event.target.checked);
    }

    useEffect(() => {
        // Update the checkbox state based on selected images
        setUseImagesChecked(selectedImages.length > 0);
    }, [selectedImages]);

    const handleUseClinicalCheck = (event) => {
        setUseClinicalChecked(event.target.checked);
        // update global settings
        updateSetting('includeClinicalData', event.target.checked);
    }

    useEffect(() => {
        // Update the checkbox state based on global settings
        setUseClinicalChecked(settings.includeClinicalData);
    }, [settings.includeClinicalData]);

    useEffect(() => {
        // Update the text value with the default prompt from settings
        setTextValue(settings.defaultPrompt);
    }, [settings.defaultPrompt]);

    return (    
        <div className="bottom-bar" style={{ height: `${bottomBarHeight}px` }}>
            <div className="clinical-data-container"  style={{ width: clinDataWidth }}>
                <h2>Clinical Data Summary</h2>
                <div className="output-response-area">
                    
                    <textarea
                        value={clinSettings.summary.value}
                        onChange={(e) => {
                            setClinicalFieldValue('summary', e.target.value);
                        }}
                        className='clinical-data-text-area' />
                </div>
                <div className="clinical-data-button-container">
                    <button onClick={() => { setClinicalFieldValue('summary', '');}}>Clear</button>
                    <button 
                        onClick={() => {updateClinicalFields(caseId, { summary: clinSettings.summary.value });}}
                        title='Save clinical summary for this case to database'>Save</button>
                    <button onClick={() => setShowClinicalData(true)} title='Show all clinical data and documents for this case. Add new documents or data as needed.'> Show All Data</button>
                </div>
                    
                <div className="clinical-modifier-div">
                    <input
                        type="checkbox"
                        id="use-clinical-checkbox"
                        checked={useClinicalChecked}
                        onChange={handleUseClinicalCheck}
                    >
                    </input>
                    <label htmlFor="use-clinical-checkbox">
                        Use clinical data in query
                    </label>
                </div>

            </div>

            <div 
                className="resizer-y"
                onMouseDown={(event) => { startResizingX(event); setYResizerPosition('left'); }}
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
                >
                    {settings.defaultPrompt}
                </textarea>
                <div className="input-button-container">
                    <button
                        className="llm-call-button"
                        onClick={() => llmCall(textValue)}
                        disabled={
                            llmResponse === 'Processing images and/or query...' || textValue.trim().length === 0
                        }
                    >
                        Submit Query
                    </button>
                    <button
                        className="llm-clear-button"
                        onClick={() => {
                            setLlmResponse('No query currently made.');
                            setTextValue('');
                        }}
                    >
                        Clear
                    </button>
                </div>
                <div className="input-modifier-div">
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
                    <button
                        className="llm-cancel-button"
                        disabled={llmResponse !==  'Processing images and/or query...'}
                        onClick={async () => {
                            await cancelLLMQuery(caseId);
                        }}>
                            Cancel
                    </button>
                    <button
                        className="history-button"
                        onClick={() => {
                            setShowHistory(true); 
                        }}>
                            History
                    </button>
                </div>


            </div>
            <ClinicalDataModal open={showClinicalData} onClose={() => setShowClinicalData(false)} />
            <HistoryModal open={showHistory} onClose={() => setShowHistory(false)} />

        </div>
    );
}

