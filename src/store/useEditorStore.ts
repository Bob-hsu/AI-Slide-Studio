import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { Presentation, Slide, SlideElement, CustomTemplate, User, TemplateFolder } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { generateSlideImage, editSlideImage } from '../services/ai';

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

interface EditorState {
  presentations: Presentation[];
  presentation: Presentation | null;
  activeSlideId: string | null;
  selectedElementId: string | null;
  customTemplates: CustomTemplate[];
  templateFolders: TemplateFolder[];
  user: User | null;
  isTemplateView: boolean;
  
  setUser: (user: User | null) => void;
  setIsTemplateView: (isTemplateView: boolean) => void;
  initSocket: () => void;
  setPresentation: (presentation: Presentation) => void;
  viewTemplate: (presentation: Presentation) => void;
  loadPresentation: (id: string) => void;
  deletePresentation: (id: string) => void;
  
  addSlide: (customTemplate?: CustomTemplate, index?: number) => void;
  deleteSlide: (id: string) => void;
  moveSlide: (id: string, direction: 'up' | 'down') => void;
  setActiveSlide: (id: string) => void;
  updateSlideBackground: (id: string, background: string) => void;
  updateSlide: (id: string, updates: Partial<Slide>) => void;
  addElement: (slideId: string, element: Omit<SlideElement, 'id'>) => void;
  updateElement: (slideId: string, elementId: string, updates: Partial<SlideElement>) => void;
  deleteElement: (slideId: string, elementId: string) => void;
  setSelectedElement: (id: string | null) => void;
  generateImageForSlide: (slideId: string) => Promise<void>;
  editImageForSlide: (slideId: string, editPrompt: string) => Promise<void>;
  
  addCustomTemplate: (name: string, slide: Slide, folderId?: string, description?: string, tags?: string[]) => void;
  deleteCustomTemplate: (id: string) => void;
  updateCustomTemplate: (id: string, updates: Partial<CustomTemplate>) => void;
  
  addTemplateFolder: (name: string) => void;
  deleteTemplateFolder: (id: string) => void;
  updateTemplateFolder: (id: string, name: string) => void;
}

const syncPresentations = (presentation: Presentation | null, state: EditorState) => {
  if (!presentation || state.isTemplateView) return state.presentations;
  const exists = state.presentations.some(p => p.id === presentation.id);
  if (exists) {
    return state.presentations.map(p => p.id === presentation.id ? presentation : p);
  } else {
    return [presentation, ...state.presentations];
  }
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      presentations: [],
      presentation: null,
      activeSlideId: null,
      selectedElementId: null,
      customTemplates: [],
      templateFolders: [],
      user: null,
      isTemplateView: false,
      
      setUser: (user) => set({ user }),
      setIsTemplateView: (isTemplateView) => set({ isTemplateView }),
      initSocket: () => {
        console.log('Socket initialized for real-time collaboration');
        // Placeholder for socket initialization
      },
      viewTemplate: (presentation) => set({ 
        presentation, 
        activeSlideId: presentation.slides[0]?.id || null,
        isTemplateView: true
      }),
      setPresentation: (presentation) => set((state) => ({ 
        presentation, 
        activeSlideId: presentation.slides[0]?.id || null,
        presentations: syncPresentations(presentation, state)
      })),

      loadPresentation: (id) => set((state) => {
        const presentation = state.presentations.find(p => p.id === id);
        if (!presentation) return state;
        return {
          presentation,
          activeSlideId: presentation.slides[0]?.id || null,
          selectedElementId: null
        };
      }),

      deletePresentation: (id) => set((state) => ({
        presentations: state.presentations.filter(p => p.id !== id),
        presentation: state.presentation?.id === id ? null : state.presentation,
        activeSlideId: state.presentation?.id === id ? null : state.activeSlideId
      })),
      
      addSlide: (customTemplate, index) => set((state) => {
        if (!state.presentation) return state;
        
        let newSlide: Slide;
        if (customTemplate) {
          // Deep copy the custom template slide and give elements new IDs
          newSlide = {
            ...customTemplate.slide,
            id: uuidv4(),
            elements: customTemplate.slide.elements.map(e => ({ ...e, id: uuidv4() }))
          };
        } else {
          newSlide = { id: uuidv4(), elements: [], background: '#ffffff' };
        }

        const newSlides = [...state.presentation.slides];
        if (typeof index === 'number') {
          newSlides.splice(index + 1, 0, newSlide);
        } else {
          newSlides.push(newSlide);
        }

        const updatedPresentation = {
          ...state.presentation,
          slides: newSlides,
          updatedAt: new Date().toISOString()
        };
        return {
          presentation: updatedPresentation,
          activeSlideId: newSlide.id,
          presentations: syncPresentations(updatedPresentation, state)
        };
      }),

      deleteSlide: (id) => set((state) => {
        if (!state.presentation) return state;
        const newSlides = state.presentation.slides.filter(s => s.id !== id);
        const updatedPresentation = {
          ...state.presentation,
          slides: newSlides,
          updatedAt: new Date().toISOString()
        };
        return {
          presentation: updatedPresentation,
          activeSlideId: state.activeSlideId === id ? (newSlides[0]?.id || null) : state.activeSlideId,
          presentations: syncPresentations(updatedPresentation, state)
        };
      }),

      moveSlide: (id, direction) => set((state) => {
        if (!state.presentation) return state;
        const slides = [...state.presentation.slides];
        const index = slides.findIndex(s => s.id === id);
        if (index === -1) return state;
        
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= slides.length) return state;
        
        [slides[index], slides[newIndex]] = [slides[newIndex], slides[index]];
        
        const updatedPresentation = {
          ...state.presentation,
          slides,
          updatedAt: new Date().toISOString()
        };
        
        return {
          presentation: updatedPresentation,
          presentations: syncPresentations(updatedPresentation, state)
        };
      }),

      setActiveSlide: (id) => set({ activeSlideId: id, selectedElementId: null }),

      updateSlideBackground: (id, background) => set((state) => {
        if (!state.presentation) return state;
        const updatedPresentation = {
          ...state.presentation,
          slides: state.presentation.slides.map(s => s.id === id ? { ...s, background } : s),
          updatedAt: new Date().toISOString()
        };
        return {
          presentation: updatedPresentation,
          presentations: syncPresentations(updatedPresentation, state)
        };
      }),

      updateSlide: (id, updates) => set((state) => {
        if (!state.presentation) return state;
        const updatedPresentation = {
          ...state.presentation,
          slides: state.presentation.slides.map(s => s.id === id ? { ...s, ...updates } : s),
          updatedAt: new Date().toISOString()
        };
        return {
          presentation: updatedPresentation,
          presentations: syncPresentations(updatedPresentation, state)
        };
      }),

      addElement: (slideId, element) => set((state) => {
        if (!state.presentation) return state;
        const newElement = { ...element, id: uuidv4() };
        const updatedPresentation = {
          ...state.presentation,
          slides: state.presentation.slides.map(s => 
            s.id === slideId ? { ...s, elements: [...s.elements, newElement] } : s
          ),
          updatedAt: new Date().toISOString()
        };
        return {
          presentation: updatedPresentation,
          presentations: syncPresentations(updatedPresentation, state)
        };
      }),

      updateElement: (slideId, elementId, updates) => set((state) => {
        if (!state.presentation) return state;
        const updatedPresentation = {
          ...state.presentation,
          slides: state.presentation.slides.map(s => 
            s.id === slideId ? {
              ...s,
              elements: s.elements.map(e => e.id === elementId ? { ...e, ...updates } : e)
            } : s
          ),
          updatedAt: new Date().toISOString()
        };
        return {
          presentation: updatedPresentation,
          presentations: syncPresentations(updatedPresentation, state)
        };
      }),

      deleteElement: (slideId, elementId) => set((state) => {
        if (!state.presentation) return state;
        const updatedPresentation = {
          ...state.presentation,
          slides: state.presentation.slides.map(s => 
            s.id === slideId ? {
              ...s,
              elements: s.elements.filter(e => e.id !== elementId)
            } : s
          ),
          updatedAt: new Date().toISOString()
        };
        return {
          presentation: updatedPresentation,
          presentations: syncPresentations(updatedPresentation, state)
        };
      }),

      setSelectedElement: (id) => set({ selectedElementId: id }),

      generateImageForSlide: async (slideId) => {
        const state = get();
        const slide = state.presentation?.slides.find(s => s.id === slideId);
        const globalStyle = state.presentation?.globalStyle;
        const imageSize = state.presentation?.imageSize || '1K';
        if (!slide || !globalStyle) return;

        state.updateSlide(slideId, { status: 'generating' });

        try {
          const imageUrl = await generateSlideImage(
            globalStyle,
            slide.title || '',
            slide.keyPoints || [],
            slide.layout || '',
            slide.imagePrompt || '',
            imageSize
          );
          get().updateSlide(slideId, { imageUrl, status: 'done' });
        } catch (error) {
          console.error(error);
          get().updateSlide(slideId, { status: 'error' });
        }
      },

      editImageForSlide: async (slideId, editPrompt) => {
        const state = get();
        const slide = state.presentation?.slides.find(s => s.id === slideId);
        if (!slide || !slide.imageUrl) return;

        state.updateSlide(slideId, { status: 'generating' });

        try {
          // Extract mime type from data URL if possible, otherwise default to image/png
          const mimeTypeMatch = slide.imageUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
          const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
          
          const newImageUrl = await editSlideImage(
            slide.imageUrl,
            mimeType,
            editPrompt
          );
          get().updateSlide(slideId, { imageUrl: newImageUrl, status: 'done' });
        } catch (error) {
          console.error(error);
          get().updateSlide(slideId, { status: 'error' });
        }
      },

      addCustomTemplate: (name, slide, folderId, description, tags) => set((state) => ({
        customTemplates: [
          {
            id: uuidv4(),
            name,
            description,
            tags,
            slide: { ...slide, id: uuidv4() },
            folderId,
            createdAt: new Date().toISOString()
          },
          ...state.customTemplates
        ]
      })),

      deleteCustomTemplate: (id) => set((state) => ({
        customTemplates: state.customTemplates.filter(t => t.id !== id)
      })),

      updateCustomTemplate: (id, updates) => set((state) => ({
        customTemplates: state.customTemplates.map(t => t.id === id ? { ...t, ...updates } : t)
      })),

      addTemplateFolder: (name) => set((state) => ({
        templateFolders: [
          ...state.templateFolders,
          { id: uuidv4(), name, createdAt: new Date().toISOString() }
        ]
      })),

      deleteTemplateFolder: (id) => set((state) => ({
        templateFolders: state.templateFolders.filter(f => f.id !== id),
        // Also clear folderId from templates in this folder
        customTemplates: state.customTemplates.map(t => t.folderId === id ? { ...t, folderId: undefined } : t)
      })),

      updateTemplateFolder: (id, name) => set((state) => ({
        templateFolders: state.templateFolders.map(f => f.id === id ? { ...f, name } : f)
      }))
    }),
    {
      name: 'ai-pitch-studio-storage',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
