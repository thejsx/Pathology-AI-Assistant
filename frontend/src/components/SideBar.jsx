import React, { useState, useEffect, useCallback, use } from 'react';
import '../styles/SideBar.css';
import {getImages} from '../communications/mainServerAPI';

export default function SideBar() {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const [images, setImages] = useState([]);
    const [imageCount, setImageCount] = useState(0);

    useEffect(() => {
        loadImages();
    }
    , []);

    const loadImages = async () => {
        try {
            const response = await getImages();
            setImages(response.data.images);
            setImageCount(response.data.count);    
        } catch (error) {
            console.error('Error fetching images:', error);
        }
    }

    return (
        <>
            {!isCollapsed && (
                <div className="sidebar">
                    <div className="sidebar-header">
                        <span className="sidebar-title">User: JRS</span>
                        <button 
                            className="collapse-btn"
                            onClick={() => setIsCollapsed(true)}
                            title="Collapse sidebar"
                        >
                            ×
                        </button>
                    </div>
                    
                    <div className="sidebar-content">
                        <div className="images-button">
                            <h3>Images ({imageCount})</h3>
                            <div className="image-list">
                                {images.map((image, index) => (
                                    <div 
                                        key={index}
                                        className="image-item"
                                        onClick={() => setSelectedImage(image)}
                                    >
                                        <img 
                                            src={`http://${location.hostname}:10000${image.url}`}
                                            alt={image.filename}
                                            className="thumbnail"
                                        />
                                        <span>{image.filename}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isCollapsed && (
                <div className="sidebar-collapsed">
                    <button 
                        className="expand-btn"
                        onClick={() => setIsCollapsed(false)}
                        title="Expand sidebar"
                    >
                        ☰
                    </button>
                </div>
            )}
        </>
    );
}