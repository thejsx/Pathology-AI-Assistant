const API_BASE = `http://${location.hostname}:10000`;
import useGlobalStore from '../../GlobalStore';

/* ----------  helpers ---------- */
async function apiPost(path, body = {}, includeUser = false) {
  if (includeUser) {
    const { user } = useGlobalStore.getState();
    body = { ...body, user_id: user };
  }
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
export const processLlmQuery = (caseId, imageIds, prompt, effort, maxTokens, includeClinicalData, includeHistory, includeUser) =>
  apiPost('/query-llm',
          { case_id: caseId, image_ids: imageIds, prompt, effort, max_tokens: maxTokens, include_clinical_data: includeClinicalData, include_history: includeHistory, include_user: includeUser }, true);

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





