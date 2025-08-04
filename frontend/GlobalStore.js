import { create } from 'zustand';
import { getLatestCase } from './src/communications/mainServerAPI';
import {  getUserSettings,  setUserSettings, getLlmHistory, clearLlmHistory, getClinicalData, updateClinicalFields} from './src/communications/mainServerAPI';

export const defaultSettings = {
  zoom: 1,
  rotate: 0,
  offsetX: 0,
  offsetY: 0,
  flipX: false,
  reasoningEffort: 'medium',
  maxTokens: 2000,
  defaultPrompt: "",
  includeHistory: false,
  includeClinicalData: false,
  includeClinSummaryOnly: true,
  includeAllClinicalData: false,
  // UI preferences
  sidebarCollapsed: false,
  videoControlsCollapsed: false,
  bottomBarHeight: 250,
  bottomBarClinDataWidth: '30vw',
  bottomBarInputTextWidth: '35vw',
  bottomBarLlmResponseWidth: '35vw',
}


const useGlobalStore = create((set, get) => ({
  // StateS
  user: 'JRS',
  selectedImages: [],
  caseId: '',

  settings: {...defaultSettings},
  defaultSettings: {...defaultSettings},

  clinSettings: {
    specimen: {'label': 'Specimen', 'value': { summary: '', details: {}, date: '' }},
    summary: { 'label': 'Summary', 'value': '' },
    procedure: { 'label': 'Procedure', 'value': '' },
    pathology: { 'label': 'Pathology', 'value': '' },
    imaging: { 'label': 'Imaging', 'value': '' },
    labs: { 'label': 'Labs', 'value': '' }
  },

  llmHistory: [],
  selectedHistory: [],

  // User inclusion for LLM history and images
  includeUserLLM: false,
  includeUserImages: false,

  setUserLLM: () => set((s) => ({ includeUserLLM: !s.includeUserLLM })),
  setUserImages: () => set((s) => ({ includeUserImages: !s.includeUserImages })),


  // Image selection helpers
  setSelectedImages: (images) => set({ selectedImages: images }),
  addSelectedImage: (image) => set((state) => ({ 
    selectedImages: [...state.selectedImages, image] 
  })),
  removeSelectedImage: (imageId) => set((state) => ({
    selectedImages: state.selectedImages.filter(img => img.id !== imageId)
  })),
  clearSelectedImages: () => set({ selectedImages: [] }),


  // Case management helpers
  setCaseId: (caseId) => {
    set({ caseId });
    // Reset selected images when case changes
    set({ selectedImages: [] });
  },

  fetchLatestCase: async () => {
    try {
      const data = await getLatestCase();
      set({ caseId: data.case_id });
    } catch (error) {
      console.error('Error fetching latest case:', error);
    }
  },

  // User settings helpers
  updateSetting: (key, value) => set((state) => ({
    settings: { ...state.settings, [key]: value }
  })),

  resetSettingsToDefault: () => set((s) => ({ settings: { ...s.defaultSettings } })),

  saveCurrentAsUser: async () => {
    const { settings, user } = get();

    await setUserSettings(user, settings);
  },

  fetchUserSettings: async () => {
    const { user } = get();
      const { settings } = await getUserSettings(user);
      if (settings) {
        set({
          settings: { ...settings },
        });
      }
      else {
        console.warn('No settings found for user:', user);
      }
    },


  // Clinical data management

  setClinicalFieldValue: (field, value) => {
    set((s) => ({ clinSettings: { ...s.clinSettings, [field]: { ...s.clinSettings[field], value } } }));
  },

  fetchClinicalData: async () => {
    const { caseId } = get();
    if (!caseId) return;
    const { clinical } = await getClinicalData(caseId);
    
    Object.entries(clinical).forEach(([field, value]) => {
      set((s) => ({
        clinSettings: { ...s.clinSettings, [field]: { ...s.clinSettings[field], value } }
      }));
    });
  },

  saveSelectedClinical: async (fields) => {
    const { caseId } = get();
    await updateClinicalFields(caseId, fields);
  },

  // LLM history management
  fetchHistory: async (includeUserLLM) => {
    const { caseId } = get();
    if (!caseId) return;
    const { history } = await getLlmHistory(caseId, includeUserLLM);
    set({ llmHistory: history});
  },

  toggleHistory: (idx) =>
    set((s) => {
      const selected = s.selectedHistory.includes(idx)
        ? s.selectedHistory.filter((i) => i !== idx)
        : [...s.selectedHistory, idx];
      return { selectedHistory: selected };
    }),

  selectAllHistory: () =>
    set((s) => ({ selectedHistory: s.llmHistory.map((_, i) => i) })),

  selectNoneHistory: () => set({ selectedHistory: [] }),

  clearHistory: async () => {
    const { caseId, selectedHistory } = get();
    await clearLlmHistory(caseId, selectedHistory);
    set((s) => ({ 
      llmHistory: s.llmHistory.filter((_, i) => !s.selectedHistory.includes(i)),
      selectedHistory: [] 
    }));
  },


}));

export default useGlobalStore;