import React from 'react';
import useGlobalStore from '../../GlobalStore';
import { captureImage } from '../communications/mainServerAPI';
import '../styles/Sidebar.css';

export default function CaptureImageButton({ streamRef }) {
    const {
        caseId,
        settings: { zoom, rotate, offsetX, offsetY, flipX, cropToVideo = false },
    } = useGlobalStore();

    const handleCapture = async () => {
        const videoElement = streamRef.current;
        if (!videoElement) return;

        try {
            const imgCanvas = document.createElement('canvas');
            const ctx = imgCanvas.getContext('2d');

            if (cropToVideo) {
                // Crop mode: capture only the actual video content
                const videoWidth = videoElement.videoWidth;
                const videoHeight = videoElement.videoHeight;
                
                // Apply device pixel ratio for high quality
                const dpr = window.devicePixelRatio || 1;
                
                // Calculate the transformed dimensions
                const transformedWidth = videoWidth * zoom;
                const transformedHeight = videoHeight * zoom;
                
                // Set canvas size to match the transformed video
                imgCanvas.width = transformedWidth * dpr;
                imgCanvas.height = transformedHeight * dpr;
                
                // Scale for device pixel ratio
                ctx.scale(dpr, dpr);
                
                // Apply transformations
                ctx.save();
                ctx.translate(transformedWidth / 2, transformedHeight / 2);
                ctx.rotate((rotate * Math.PI) / 180);
                ctx.scale(flipX ? -1 : 1, 1);
                
                // Draw the video at its natural size, centered
                ctx.drawImage(
                    videoElement,
                    -videoWidth / 2,
                    -videoHeight / 2,
                    videoWidth,
                    videoHeight
                );
                ctx.restore();
                
            } else {
                // Full frame mode: capture the entire container with black bars
                const cssWidth = videoElement.clientWidth;
                const cssHeight = videoElement.clientHeight;
                const dpr = window.devicePixelRatio || 1;

                imgCanvas.width = cssWidth * dpr;
                imgCanvas.height = cssHeight * dpr;
                ctx.scale(dpr, dpr);

                // Fill with black background
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, cssWidth, cssHeight);

                // Calculate scale to fit video in container
                const scale = Math.min(
                    cssWidth / videoElement.videoWidth,
                    cssHeight / videoElement.videoHeight
                );
                const drawW = videoElement.videoWidth * scale;
                const drawH = videoElement.videoHeight * scale;

                // Apply all transformations
                ctx.save();
                ctx.translate(cssWidth / 2, cssHeight / 2);
                ctx.translate(offsetX, offsetY);
                ctx.rotate((rotate * Math.PI) / 180);
                ctx.scale(flipX ? -zoom : zoom, zoom);
                ctx.drawImage(videoElement, -drawW / 2, -drawH / 2, drawW, drawH);
                ctx.restore();
            }

            const dataURL = imgCanvas.toDataURL('image/png');
            const result = await captureImage(dataURL, caseId);
            console.log('Image captured and sent:', result);

            const filename = result.image_path.split(/[/\\\\]/).pop();
            window.dispatchEvent(
                new CustomEvent('imageCaptured', { 
                    detail: { 
                        filename,
                        cropped: cropToVideo 
                    } 
                })
            );
        } catch (error) {
            console.error('Error capturing image:', error);
        }
    };

    return (
        <button
            onClick={handleCapture}
            className="control-btn primary"
            title={`Capture Image ${useGlobalStore.getState().settings.cropToVideo ? '(Cropped)' : '(Full Frame)'}`}
        >
            📷 Capture Image
        </button>
    );
}