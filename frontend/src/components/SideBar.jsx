import React, { useState, useEffect, useRef, use } from 'react';
import '../styles/SideBar.css';
import { getImages, deleteImages, listCases, createNewCase, captureImage } from '../communications/mainServerAPI';
import useGlobalStore from '../../GlobalStore';
import { Autocomplete, TextField, Box } from '@mui/material';
import UserSettingsModal from './UserSettingsModal';
import CaptureImageButton from './CaptureImageButton';
import useDraggable from '../hooks/useDraggable';



export default function SideBar({ streamRef }) {
    const {
        caseId,
        setCaseId,
        selectedImages,
        setSelectedImages,
        settings: { sidebarCollapsed },
        updateSetting,
    } = useGlobalStore();
    const isCollapsed = sidebarCollapsed;
    const [serverImages, setServerImages] = useState([]);
    const [imageCount, setImageCount] = useState(0);
    const [imagesModal, setImagesModal] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState(null);
    const imagesButtonRef = useRef(null);
    const selectButtonRef = useRef(null);
    const sidebarRef = useRef(null);
    const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
    const imageModalRef = useRef(null);
    const [modalKey, setModalKey] = useState(0);
    const imagePos = useDraggable(imageModalRef, { x: modalPosition.left + 5, y: modalPosition.top }, modalKey);
    const [selectModalPosition, setSelectModalPosition] = useState({ top: 0, left: 0 });
    const [selectCaseModal, setSelectCaseModal] = useState(false);
    const [casesList, setCasesList] = useState([]);
    const [caseInput, setCaseInput] = useState('');
    const uploadInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const handleImageCaptured = () => loadImages();
        window.addEventListener('imageCaptured', handleImageCaptured);
        return () => window.removeEventListener('imageCaptured', handleImageCaptured);
    }, [caseId, serverImages]);


    useEffect(() => {
        loadImages();
        console.log('Loading images for case:', caseId);
    }, [caseId]);


    const loadImages = async () => {
        try {if (caseId) {
            const response = await getImages(caseId);
            setServerImages(response.images);
            setImageCount(response.count);
        }
            else {
                console.log('No case ID set, skipping image load.');
                setServerImages([]);
                setImageCount(0);
            }
        } catch (error) {
            console.error('Error fetching images:', error);
        }
    };

    const handleSelectAll = () => {

        setSelectedImages(serverImages.map(img => img.filename));
    };

    const handleSelectNone = () => {
        setSelectedImages([]);
    };

    const handleDeleteSelected = async () => {
        try {
            const { images: updated, count } = await deleteImages(selectedImages, caseId);
            setServerImages(updated);
            setImageCount(count);
            setSelectedImages([]);
        } catch (error) {
            console.error('Error deleting images:', error);
        }
    };

    const handleToggleModal = () => {
        if (imagesModal) {
            setImagesModal(false);
        } else if (imagesButtonRef.current && sidebarRef.current) {
            setModalKey(prev => prev + 1);
            setImagesModal(true);
        }
    };

    const handleNewCase = async () => {
        const data = await createNewCase();
        setCaseId(data.case_id);
    };

    const handleSelectCaseModal = async () => {
        if (selectCaseModal) {
            setSelectCaseModal(false);
        } else if (selectButtonRef.current && sidebarRef.current) {
            const btn = selectButtonRef.current.getBoundingClientRect();
            const sb = sidebarRef.current.getBoundingClientRect();
            setSelectModalPosition({ top: btn.top, left: sb.right });
            setCaseInput(caseId);
            try {
                const data = await listCases();
                setCasesList(data.cases || []);
            } catch (err) {
                console.error('Error loading cases:', err);
            }
            setSelectCaseModal(true);
        }
    };

    const confirmCase = () => {
        if (!caseInput.trim()) return;
        setCaseId(caseInput.trim());
        setSelectCaseModal(false);
        setCaseInput('');
    };



    const handleUploadClick = () => {
        uploadInputRef.current?.click();
    };

    const handleFilesChosen = async (event) => {
        setIsUploading('selecting')
        const files = Array.from(event.target.files || []);
        if (files.length === 0) {
            setIsUploading(false);
            return};
        setIsUploading('uploading');
        try {
            for (const file of files) {
                const dataUrl = (file) => new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                const result = await captureImage(await dataUrl(file), caseId);
                console.log('Image captured and sent:', result);
            }
        } catch (error) {
            console.error('Error uploading images:', error);
        } finally {
            setIsUploading(false);
            // event.current.value = ''; // Reset the input value
            uploadInputRef.current.value = ''; // Reset the input value
            loadImages(); // Reload images after upload
        }
    };


    return (
        <>
            {!isCollapsed && (
                <div className="sidebar" ref={sidebarRef}>
                    <div className="sidebar-header">
                        <div className="sidebar-top-container">
                            <span className="sidebar-user"><b>User: </b> JRS</span>
                            <button
                                className="collapse-btn"
                            onClick={() => updateSetting('sidebarCollapsed', true)}
                                title="Collapse sidebar"
                            >
                                ×
                            </button>
                        </div>    
                        <span className="sidebar-case"><b>Case: </b> {caseId}</span>
                        
                        
                    </div>
                    
                    <div className="sidebar-content">

                        <button onClick={handleNewCase} disabled={imageCount === 0} className="sidebar-button">
                            New Case
                        </button>
                        <button ref={selectButtonRef} onClick={handleSelectCaseModal} className="sidebar-button">
                            Select Case
                        </button>

                        {selectCaseModal && (
                            <div className="select-case-overlay" onClick={() => setSelectCaseModal(false)}>
                                <div
                                    className="select-case-modal"
                                    style={{ position: 'fixed', top: selectModalPosition.top, left: selectModalPosition.left }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <h3>Select or Enter Case</h3>
                                    <div>

                                        <Autocomplete
                                            freeSolo
                                            disablePortal
                                            className="case-combobox"
                                            slotProps={{
                                                popper: { className: 'case-combobox-popper' },
                                                paper: { className: 'case-combobox-paper' },
                                                option: { className: 'case-combobox-option' },
                                            }}
                                            options={casesList}
                                            // value={caseInput}
                                            onInputChange={(_, newInputValue) => setCaseInput(newInputValue)}
                                            onChange={(_, newValue) => setCaseInput(newValue ?? '')}
                                            renderInput={(params) => (
                                                <TextField {...params} placeholder="Select existing case..." />
                                            )}
                                        />
                                        <hr />
                
                                        <button onClick={confirmCase} disabled={!caseInput.toString().trim()}>
                                            Select/Create Case
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            className="sidebar-button"
                            id="images-button"
                            ref={imagesButtonRef}
                            onClick={handleToggleModal}
                        >
                            Images ({imageCount})
                        </button>
                        {imagesModal && (
                            <div className="images-modal-overlay" onClick={() => setImagesModal(false)}>
                                <div
                                    className='images-modal-container'
                                    ref={imageModalRef}
                                    style={{ position: 'fixed', top: imagePos.y, left: imagePos.x }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="images-modal-actions" style={{ display: serverImages.length > 0 ? 'flex' : 'none' }} onClick={e => e.stopPropagation()}>
                                            <button onClick={handleSelectAll} disabled={selectedImages.length === serverImages.length}>
                                                Select All
                                            </button>
                                            <button onClick={handleSelectNone} disabled={selectedImages.length === 0}>
                                                Select None
                                            </button>
                                            <button onClick={handleDeleteSelected} disabled={selectedImages.length === 0}>
                                                Delete Selected
                                            </button>
                                        </div>
                                    <div className="images-modal"  onClick={e => e.stopPropagation()}>

                                        {!serverImages.length? (
                                            <p>No images available</p>
                                            ) : (
                                        serverImages.map((image, index) => {
                                            const url = `https://${location.hostname}:8000${image.url}`;
                                            const isChecked = selectedImages.includes(image.filename);
                                            return (
                                                <div key={image.filename} className="image-item">
                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                        onChange={() => {
                                                            if (isChecked) {
                                                                setSelectedImages(selectedImages.filter(img => img !== image.filename));
                                                            } else {
                                                                setSelectedImages([...selectedImages, image.filename]);
                                                            }
                                                        }}
                                                        />
                                                        {`Image ${index + 1}`}
                                                    </label>
                                                    <img
                                                        src={url}
                                                        alt={`Image ${index + 1}`}
                                                        className="thumbnail"
                                                        onClick={() => setLightboxUrl(url)}
                                                    />
                                                </div>
                                            );
                                        }))}

                                    </div>
                                </div>
                            </div>    
                        )}


                        {/* visible upload button */}
                        <button
                            className="sidebar-button"
                            onClick={handleUploadClick}
                            disabled={!caseId || isUploading}
                            >
                            {isUploading === 'selecting'? 'Awaiting selection..' : isUploading === 'uploading' ? 'Uploading...' : 'Upload Images'}
                        </button>

                        <button
                            className="sidebar-button"
                            onClick={() => setShowSettings(true)}
                            >
                                User Settings
                        </button>
                        

                        <div style={{ flex: 1 }} />
                        <CaptureImageButton streamRef={streamRef} className="sidebar-button" />
                            {/* hidden file input */}
                            <input
                                ref={uploadInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                                onChange={handleFilesChosen}
                            />



                    </div>
                </div>
            )}
            {isCollapsed && (
                <div className="sidebar-collapsed">
                    <button 
                        className="expand-btn"
                        onClick={() => updateSetting('sidebarCollapsed', false)}
                        title="Expand sidebar"
                    >
                        ☰
                    </button>
                </div>
            )}
            {lightboxUrl && (
                <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)}>
                    <img src={lightboxUrl} alt="" className="lightbox-image" />
                </div>
            )}
            <UserSettingsModal
                open={showSettings}
                onClose={() => setShowSettings(false)}
                        />
        </>
    );
}