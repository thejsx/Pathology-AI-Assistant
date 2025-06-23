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

export async function deleteImages(filenames, caseId) {
    console.log('Deleting images:', filenames, 'from case:', caseId);
    const response = await fetch(`${API_BASE}/delete-images`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filenames: filenames, case_id: caseId }),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

export async function getImages(caseId) {
    const response = await fetch(`${API_BASE}/get-images`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            case_id: caseId
        })
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Received image data:', data); // Debug log
    return data;
}

export async function getLatestCase() {
    const response = await fetch(`${API_BASE}/get-latest-case`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

export async function listCases() {
    const response = await fetch(`${API_BASE}/list-cases`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

export async function createNewCase() {
    const response = await fetch(`${API_BASE}/create-new-case`, {
        method: 'GET',
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

export async function processImages(caseId, selectedImages, prompt) {
    const response = await fetch(`${API_BASE}/query-llm`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            case_id: caseId,
            image_ids: selectedImages,
            prompt: prompt
        })
    });
    return response.json();
}