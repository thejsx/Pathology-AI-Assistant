import { create } from 'zustand';
import { getLatestCase } from './src/communications/mainServerAPI';
import {  getUserSettings,  setUserSettings, getLlmHistory, clearLlmHistory} from './src/communications/mainServerAPI';

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
  // UI preferences
  sidebarCollapsed: false,
  videoControlsCollapsed: false,
  bottomBarHeight: 250,
  bottomBarClinDataWidth: '30vw',
  bottomBarInputTextWidth: '35vw',
  bottomBarLlmResponseWidth: '35vw',
}

export const defaultClinSettings = {
  summary: 'No clinical data available.',
  procedure: 'No procedure data available.',  
}

const useGlobalStore = create((set, get) => ({
  // StateS
  user: 'JRS',
  selectedImages: [],
  caseId: '',

  settings: {...defaultSettings},
  defaultSettings: {...defaultSettings},
  clinSettings: {...defaultClinSettings},

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
  setCaseId: (caseId) => set({ caseId }),
  
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
    try {
      const { settings } = await getUserSettings(user);
      if (settings) {
        set({
          settings: { ...settings },
        });
      }
    } catch {

    }
  },

  // Clinical data management
  setClinSummary: (summary) => set((s) => ({
    clinSettings: { ...s.clinSettings, summary: summary }
  })),

  setProcedure: (procedure) => set((s) => ({
    clinSettings: { ...s.clinSettings, procedure: procedure }
  })),

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