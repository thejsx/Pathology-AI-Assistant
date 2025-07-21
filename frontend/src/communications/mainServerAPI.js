const API_BASE = `http://${location.hostname}:10000`;
import useGlobalStore from '../../GlobalStore';

/* ----------  helpers ---------- */
async function apiPost(path, body = {}, includeUser = false) {
  if (includeUser) {
    const { user } = useGlobalStore.getState();
    body = { ...body, user_id: user };
  }
  console.log(`POST ${API_BASE}${path}`, body);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ---------- image endpoints ---------- */
export const captureImage = (image, caseId, includeUser = true) =>
    apiPost('/capture-image', { image, case_id: caseId }, includeUser);

export const deleteImages = (filenames, caseId, includeUser = false) =>
  apiPost('/delete-images', { filenames, case_id: caseId }, includeUser);

export const getImages = (caseId, includeUser = false) =>
  apiPost('/get-images', { case_id: caseId }, includeUser);

/* ---------- case helpers ---------- */
export const getLatestCase = (includeUser = false) =>
  apiPost('/get-latest-case', {}, includeUser);

export const listCases = (includeUser = false) =>
  apiPost('/list-cases', {}, includeUser);

export const createNewCase = (includeUser = false) =>
  apiPost('/create-new-case', {}, includeUser);

/* ---------- LLM helpers ---------- */
export const processLlmQuery = (caseId, imageIds, prompt, effort, maxTokens, includeHistory, includeUser, clinicalData) =>
  apiPost('/query-llm',
          { case_id: caseId, image_ids: imageIds, prompt, effort, max_tokens: maxTokens,  include_history: includeHistory, include_user: includeUser, clinical_data: clinicalData }, true);

export const cancelLLMQuery = caseId =>
  apiPost('/cancel-llm-query', { case_id: caseId }, true);

/* ---------- user settings ---------- */
export const getUserSettings = userId =>
  apiGet(`/user-settings/${userId}`);

export const setUserSettings = (userId, settings) =>
  apiPost(`/user-settings/${userId}`, settings);

/* ---------- LLM history ---------- */
export const appendLlmHistory = (caseId, prompt, response, imageCount) =>
  apiPost('/append-llm-history', { case_id: caseId, prompt, response, image_count: imageCount }, true);

export const getLlmHistory = (caseId, includeUser = false) =>
  apiPost('/llm-history', { case_id: caseId }, includeUser);

export const clearLlmHistory = (caseId, selected) =>
  apiPost('/clear-llm-history',
          { case_id: caseId, selected_history: selected });

          /* ---------- clinical data ---------- */
export const getClinicalData = (caseId) =>
  apiPost('/clinical-data/get', { case_id: caseId });

export const updateClinicalFields = (caseId, fields) =>
  apiPost('/clinical-data/update', { case_id: caseId, fields });

/* ---------- clinical documents ---------- */
export const clinicalDocsRetrieve = (caseId) =>
  apiPost('/clinical-docs/retrieve', { case_id: caseId });

export const uploadClinicalDoc = (caseId, filename, fileData) =>
  apiPost('/clinical-docs/upload',
          { case_id: caseId, filename, file_data: fileData }, true);

export const deleteClinicalDocs = (caseId, urls) =>
  apiPost('/clinical-docs/delete', { case_id: caseId, urls });

/* ---------- clinical documents llm call ---------- */
export const processClinicalDocsLlmQuery = (caseId, selected, specimen) =>
  apiPost('/clinical-docs/llm-query',
          { case_id: caseId, selected, specimen }, true);




