
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  type?: 'text' | 'image';
  imageUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}
