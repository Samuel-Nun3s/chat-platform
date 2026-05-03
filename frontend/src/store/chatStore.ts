import { create } from 'zustand';
import type { ChatMember, Message } from '../types';

interface ChatState {
  chats: ChatMember[];
  activeChatId: string | null;
  messages: Record<string, Message[]>;
  unreadCounts: Record<string, number>;
  lastActivity: Record<string, string>;
  setChats: (chats: ChatMember[]) => void;
  setActiveChat: (chatId: string | null) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  removeMessage: (chatId: string, messageId: string) => void;
  removeChat: (chatId: string) => void;
  incrementUnread: (chatId: string) => void;
  clearUnread: (chatId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChatId: null,
  messages: {},
  unreadCounts: {},
  lastActivity: {},
  setChats: (chats) => {
    const lastActivity: Record<string, string> = {};
    chats.forEach((m) => {
      if (m.chat?.createdAt) lastActivity[m.chatId] = m.chat.createdAt;
    });
    set((state) => ({ chats, lastActivity: { ...lastActivity, ...state.lastActivity } }));
  },
  setActiveChat: (chatId) => set({ activeChatId: chatId }),
  setMessages: (chatId, messages) =>
    set((state) => {
      const last = messages[messages.length - 1];
      return {
        messages: { ...state.messages, [chatId]: messages },
        lastActivity: last
          ? { ...state.lastActivity, [chatId]: last.createdAt }
          : state.lastActivity,
      };
    }),
  addMessage: (message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [message.chatId]: [...(state.messages[message.chatId] ?? []), message],
      },
      lastActivity: { ...state.lastActivity, [message.chatId]: message.createdAt },
    })),
  removeMessage: (chatId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] ?? []).filter((m) => m.id !== messageId),
      },
    })),
  removeChat: (chatId) =>
    set((state) => {
      const messages = { ...state.messages };
      const unreadCounts = { ...state.unreadCounts };
      const lastActivity = { ...state.lastActivity };
      delete messages[chatId];
      delete unreadCounts[chatId];
      delete lastActivity[chatId];
      return {
        chats: state.chats.filter((c) => c.chatId !== chatId),
        activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
        messages,
        unreadCounts,
        lastActivity,
      };
    }),
  incrementUnread: (chatId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [chatId]: (state.unreadCounts[chatId] ?? 0) + 1,
      },
    })),
  clearUnread: (chatId) =>
    set((state) => {
      if (!state.unreadCounts[chatId]) return state;
      const unreadCounts = { ...state.unreadCounts };
      delete unreadCounts[chatId];
      return { unreadCounts };
    }),
}));
