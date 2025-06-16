const API_BASE = `http://${location.hostname}:10000`;

export async function captureImage(imageData, caseId) {
    console.log(location.protocol, location.hostname);
    const response = await fetch(`${API_BASE}/capture-image`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image: imageData,
            case_id: caseId
        })
    });
    return response.json();
}


export async function processImages(caseId, imageIds) {
    const response = await fetch(`${API_BASE}/process-llm`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            case_id: caseId,
            image_ids: imageIds
        })
    });
    return response.json();
}

export async function getImages() {
    const response = await fetch(`${API_BASE}/get-images`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Received image data:', data); // Debug log
    return data;
}

