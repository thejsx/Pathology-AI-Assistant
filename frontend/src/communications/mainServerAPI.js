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

export async function uploadImages(caseId, files) {
    const form = new FormData();
    form.append('case_id', caseId);
    files.forEach(f => form.append('files', f));   

    const response = await fetch(`/api/images/upload`, {  
        method: 'POST',
        body: form,
        credentials: 'include'   // if you rely on cookies / auth
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
    }
    return response.json();      // { images: [...], count: n }
}

export async function processLlmQuery(  caseId,  selectedImages,  prompt,  effort,  options) {
    const payload = {
        case_id: caseId,
        image_ids: selectedImages,
        prompt: prompt,
        effort: effort,
        options: options
    };
    console.log('Processing LLM query with payload:', payload);
    const response = await fetch(`${API_BASE}/query-llm`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),  
    });

    return response.json();
}

export async function cancelLLMQuery(caseId) {
    const response = await fetch(`${API_BASE}/cancel-llm-query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ case_id: caseId }),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

export async function getUserSettings(userId) {
  const res = await fetch(`${API_BASE}/user-settings/${userId}`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();          // { settings: { … } }
}

export async function setUserSettings(userId, settings) {
  const res = await fetch(`${API_BASE}/user-settings/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();          // { status: 'saved' }
}

export async function getLlmHistory(caseId) {
    const response = await fetch(`${API_BASE}/llm-history/${caseId}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

export async function clearLlmHistory(caseId, selectedHistory) {

    const response = await fetch(`${API_BASE}/clear-llm-history`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ case_id: caseId, selected_history: selectedHistory }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

export async function appendLlmHistory(historyEntry) {
    const response = await fetch(`${API_BASE}/append-llm-history`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(historyEntry),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}