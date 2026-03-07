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

export interface TemplateFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface CustomTemplate {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  slide: Slide;
  thumbnail?: string;
  folderId?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
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
