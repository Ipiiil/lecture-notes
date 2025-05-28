export const MAX_MESSAGE_LENGTH = parseInt(process.env.NEXT_PUBLIC_MAX_MESSAGE_LENGTH || "5000", 10);
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
export const ACCEPTED_FILE_TYPES = process.env.NEXT_PUBLIC_ACCEPTED_FILE_TYPES || ".txt,.doc,.docx,.pdf,.png,.jpg,.jpeg";
export const MAX_FILES = parseInt(process.env.NEXT_PUBLIC_MAX_FILES || "1", 10);
export const MAX_FILE_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || "20", 10);

export type ServerFileInfo = {
  uid: string;
  chatUid: string;
  name: string;
  type: string;
  size: number;
  url: string;
  status?: boolean;
};

export type StagedFile = {
  uid: string;
  file: File;
  uploading: boolean;
  error: boolean;
  serverFileInfo?: ServerFileInfo;
};

export type Attachment = {
  uid: string;
  name: string;
  type: string;
  size: number;
  url?: string;
};

export type Message = {
  uid: string;
  chatUid: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  isLoading?: boolean;
  attachments?: Attachment[];
  error?: boolean;
};

export type Chat = {
  uid: string;
  title: string;
  messages: Message[];
  createdAt?: string;
  updatedAt?: string;
};