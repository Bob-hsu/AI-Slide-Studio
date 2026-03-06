export type ElementType = 'text' | 'image' | 'shape';

export interface SlideElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  style?: React.CSSProperties;
}

export interface Slide {
  id: string;
  elements: SlideElement[];
  background: string;
  // Image PPT specific fields
  title?: string;
  imageUrl?: string;
  imagePrompt?: string;
  keyPoints?: string[];
  layout?: string;
  status?: 'pending' | 'generating' | 'done' | 'error';
}

export interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
  isImagePPT?: boolean;
  globalStyle?: string;
  language?: string;
  imageSize?: string;
}
