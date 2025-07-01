import React from 'react';
import useGlobalStore from '../../GlobalStore';
import { captureImage } from '../communications/mainServerAPI';
import '../styles/SideBar.css';

export default function CaptureImageButton({ streamRef }) {
    const {
        caseId,
        settings: { zoom, rotate, offsetX, offsetY, flipX },
    } = useGlobalStore();

    const handleCapture = async () => {
        const videoElement = streamRef.current;
        if (!videoElement) return;

        try {
            const imgCanvas = document.createElement('canvas');
            const ctx = imgCanvas.getContext('2d');

            const cssWidth = videoElement.clientWidth;
            const cssHeight = videoElement.clientHeight;
            const dpr = window.devicePixelRatio || 1;

            imgCanvas.width = cssWidth * dpr;
            imgCanvas.height = cssHeight * dpr;
            ctx.scale(dpr, dpr);

            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, cssWidth, cssHeight);

            const scale = Math.min(
                cssWidth / videoElement.videoWidth,
                cssHeight / videoElement.videoHeight
            );
            const drawW = videoElement.videoWidth * scale;
            const drawH = videoElement.videoHeight * scale;

            ctx.save();
            ctx.translate(cssWidth / 2, cssHeight / 2);
            ctx.translate(offsetX, offsetY);
            ctx.rotate((rotate * Math.PI) / 180);
            ctx.scale(flipX ? -zoom : zoom, zoom);
            ctx.drawImage(videoElement, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();

            const dataURL = imgCanvas.toDataURL('image/png');
            const result = await captureImage(dataURL, caseId);
            console.log('Image captured and sent:', result);

            const filename = result.image_path.split(/[/\\\\]/).pop();
            window.dispatchEvent(
                new CustomEvent('imageCaptured', { detail: { filename } })
            );
        } catch (error) {
            console.error('Error capturing image:', error);
        }
    };

    return (
        <button
            onClick={handleCapture}
            className="sidebar-button"
        >
            Capture Image
        </button>
    );
}