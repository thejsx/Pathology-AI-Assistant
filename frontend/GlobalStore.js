import { create } from 'zustand';
import { getLatestCase } from './src/communications/mainServerAPI';

const useGlobalStore = create((set) => ({
  // State
  selectedImages: [],
  caseId: '',
  
  // Actions
  setSelectedImages: (images) => set({ selectedImages: images }),
  addSelectedImage: (image) => set((state) => ({ 
    selectedImages: [...state.selectedImages, image] 
  })),
  removeSelectedImage: (imageId) => set((state) => ({
    selectedImages: state.selectedImages.filter(img => img.id !== imageId)
  })),
  clearSelectedImages: () => set({ selectedImages: [] }),

  setCaseId: (caseId) => set({ caseId }),

  // Fetch latest case - call this manually when app starts
  fetchLatestCase: async () => {
    try {
      const data = await getLatestCase();
      set({ caseId: data.case_id });
    } catch (error) {
      console.error('Error fetching latest case:', error);
    }
  },
}));

export default useGlobalStore;