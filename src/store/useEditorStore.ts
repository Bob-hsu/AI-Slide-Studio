import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { Presentation, Slide, SlideElement } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { generateSlideImage } from '../services/ai';
import { io, Socket } from 'socket.io-client';

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

interface User {
  id: string;
  name: string;
  color: string;
}

interface EditorState {
  presentations: Presentation[];
  presentation: Presentation | null;
  activeSlideId: string | null;
  selectedElementId: string | null;
  
  // Multi-user state
  user: User | null;
  activeUsers: User[];
  socket: Socket | null;
  isRemoteUpdate: boolean;
  
  setUser: (user: User) => void;
  initSocket: () => void;
  
  setPresentation: (presentation: Presentation, remote?: boolean) => void;
  loadPresentation: (id: string) => void;
  deletePresentation: (id: string) => void;
  
  addSlide: (remote?: boolean) => void;
  deleteSlide: (id: string, remote?: boolean) => void;
  setActiveSlide: (id: string) => void;
  updateSlideBackground: (id: string, background: string, remote?: boolean) => void;
  updateSlide: (id: string, updates: Partial<Slide>, remote?: boolean) => void;
  addElement: (slideId: string, element: Omit<SlideElement, 'id'>, remote?: boolean) => void;
  updateElement: (slideId: string, elementId: string, updates: Partial<SlideElement>, remote?: boolean) => void;
  deleteElement: (slideId: string, elementId: string, remote?: boolean) => void;
  setSelectedElement: (id: string | null) => void;
  generateImageForSlide: (slideId: string) => Promise<void>;
}

const syncPresentations = (presentation: Presentation | null, presentations: Presentation[]) => {
  if (!presentation) return presentations;
  const exists = presentations.some(p => p.id === presentation.id);
  if (exists) {
    return presentations.map(p => p.id === presentation.id ? presentation : p);
  } else {
    return [presentation, ...presentations];
  }
};

const COLORS = ['#F87171', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F472B6'];

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      presentations: [],
      presentation: null,
      activeSlideId: null,
      selectedElementId: null,
      
      user: null,
      activeUsers: [],
      socket: null,
      isRemoteUpdate: false,

      setUser: (user) => set({ user }),

      initSocket: () => {
        const state = get();
        if (state.socket || !state.user) return;

        const socket = io();
        
        socket.on('connect', () => {
          console.log('Connected to server');
          if (state.presentation) {
            socket.emit('join-presentation', {
              presentationId: state.presentation.id,
              user: state.user
            });
          }
        });

        socket.on('presentation-update', (presentation: Presentation) => {
          set({ isRemoteUpdate: true });
          get().setPresentation(presentation, true);
          set({ isRemoteUpdate: false });
        });

        socket.on('presence-update', (users: User[]) => {
          set({ activeUsers: users });
        });

        set({ socket });
      },
      
      setPresentation: (presentation, remote = false) => {
        set((state) => {
          const newState = { 
            presentation, 
            activeSlideId: state.activeSlideId || presentation.slides[0]?.id || null,
            presentations: syncPresentations(presentation, state.presentations)
          };
          
          if (!remote && state.socket) {
            state.socket.emit('update-presentation', {
              presentationId: presentation.id,
              presentation
            });
          }
          
          return newState;
        });
      },

      loadPresentation: (id) => set((state) => {
        const presentation = state.presentations.find(p => p.id === id);
        if (!presentation) return state;

        if (state.socket) {
          state.socket.emit('join-presentation', {
            presentationId: id,
            user: state.user
          });
        }

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
      
      addSlide: (remote = false) => set((state) => {
        if (!state.presentation) return state;
        const newSlide: Slide = { id: uuidv4(), elements: [], background: '#ffffff' };
        const updatedPresentation = {
          ...state.presentation,
          slides: [...state.presentation.slides, newSlide],
          updatedAt: new Date().toISOString()
        };

        if (!remote && state.socket) {
          state.socket.emit('update-presentation', {
            presentationId: state.presentation.id,
            presentation: updatedPresentation
          });
        }

        return {
          presentation: updatedPresentation,
          activeSlideId: newSlide.id,
          presentations: syncPresentations(updatedPresentation, state.presentations)
        };
      }),

      deleteSlide: (id, remote = false) => set((state) => {
        if (!state.presentation) return state;
        const newSlides = state.presentation.slides.filter(s => s.id !== id);
        const updatedPresentation = {
          ...state.presentation,
          slides: newSlides,
          updatedAt: new Date().toISOString()
        };

        if (!remote && state.socket) {
          state.socket.emit('update-presentation', {
            presentationId: state.presentation.id,
            presentation: updatedPresentation
          });
        }

        return {
          presentation: updatedPresentation,
          activeSlideId: state.activeSlideId === id ? (newSlides[0]?.id || null) : state.activeSlideId,
          presentations: syncPresentations(updatedPresentation, state.presentations)
        };
      }),

      setActiveSlide: (id) => set({ activeSlideId: id, selectedElementId: null }),

      updateSlideBackground: (id, background, remote = false) => set((state) => {
        if (!state.presentation) return state;
        const updatedPresentation = {
          ...state.presentation,
          slides: state.presentation.slides.map(s => s.id === id ? { ...s, background } : s),
          updatedAt: new Date().toISOString()
        };

        if (!remote && state.socket) {
          state.socket.emit('update-presentation', {
            presentationId: state.presentation.id,
            presentation: updatedPresentation
          });
        }

        return {
          presentation: updatedPresentation,
          presentations: syncPresentations(updatedPresentation, state.presentations)
        };
      }),

      updateSlide: (id, updates, remote = false) => set((state) => {
        if (!state.presentation) return state;
        const updatedPresentation = {
          ...state.presentation,
          slides: state.presentation.slides.map(s => s.id === id ? { ...s, ...updates } : s),
          updatedAt: new Date().toISOString()
        };

        if (!remote && state.socket) {
          state.socket.emit('update-presentation', {
            presentationId: state.presentation.id,
            presentation: updatedPresentation
          });
        }

        return {
          presentation: updatedPresentation,
          presentations: syncPresentations(updatedPresentation, state.presentations)
        };
      }),

      addElement: (slideId, element, remote = false) => set((state) => {
        if (!state.presentation) return state;
        const newElement = { ...element, id: uuidv4() };
        const updatedPresentation = {
          ...state.presentation,
          slides: state.presentation.slides.map(s => 
            s.id === slideId ? { ...s, elements: [...s.elements, newElement] } : s
          ),
          updatedAt: new Date().toISOString()
        };

        if (!remote && state.socket) {
          state.socket.emit('update-presentation', {
            presentationId: state.presentation.id,
            presentation: updatedPresentation
          });
        }

        return {
          presentation: updatedPresentation,
          presentations: syncPresentations(updatedPresentation, state.presentations)
        };
      }),

      updateElement: (slideId, elementId, updates, remote = false) => set((state) => {
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

        if (!remote && state.socket) {
          state.socket.emit('update-presentation', {
            presentationId: state.presentation.id,
            presentation: updatedPresentation
          });
        }

        return {
          presentation: updatedPresentation,
          presentations: syncPresentations(updatedPresentation, state.presentations)
        };
      }),

      deleteElement: (slideId, elementId, remote = false) => set((state) => {
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

        if (!remote && state.socket) {
          state.socket.emit('update-presentation', {
            presentationId: state.presentation.id,
            presentation: updatedPresentation
          });
        }

        return {
          presentation: updatedPresentation,
          presentations: syncPresentations(updatedPresentation, state.presentations)
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
      }
    }),
    {
      name: 'ai-slide-studio-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ 
        presentations: state.presentations,
        user: state.user
      }),
    }
  )
);
