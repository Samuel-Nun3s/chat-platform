export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Chat {
  id: string;
  type: 'private' | 'group';
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  members?: ChatMember[];
}

export interface ChatMember {
  id: string;
  chatId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  chat: Chat;
  user?: User;
}

export interface ReadReceipt {
  id: string;
  messageId: string;
  userId: string;
  deliveredAt: string;
  readAt: string | null;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  createdAt: string;
  readReceipts?: ReadReceipt[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
