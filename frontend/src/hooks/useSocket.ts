import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { api } from '../services/api';
import type { Message } from '../types';

export function useSocket(token: string | undefined) {
  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    socket.on('connect', () => {
      const { chats } = useChatStore.getState();
      chats.forEach((member) => socket.emit('join_chat', member.chatId));
    });

    socket.on('new_message', (message: Message) => {
      const { activeChatId, addMessage, incrementUnread } = useChatStore.getState();
      const { user } = useAuthStore.getState();
      addMessage(message);
      if (message.chatId !== activeChatId && message.senderId !== user?.id) {
        incrementUnread(message.chatId);
      }
    });

    socket.on('new_chat', async ({ chatId }: { chatId: string }) => {
      const { tokens } = useAuthStore.getState();
      if (!tokens) return;
      const chats = await api.get<any[]>('/chats', tokens.accessToken);
      useChatStore.getState().setChats(chats);
      socket.emit('join_chat', chatId);
    });

    socket.on('message_deleted', ({ messageId, chatId }: { messageId: string; chatId: string }) => {
      useChatStore.getState().removeMessage(chatId, messageId);
    });

    socket.on('message_read', () => {
      // Read receipts are received here. UI for read indicators can be added later.
    });

    return () => {
      socket.off('connect');
      socket.off('new_message');
      socket.off('new_chat');
      socket.off('message_deleted');
      socket.off('message_read');
      disconnectSocket();
    };
  }, [token]);
}

export function joinChat(chatId: string) {
  getSocket()?.emit('join_chat', chatId);
}

export function sendMessage(payload: {
  chatId: string;
  senderId: string;
  content: string;
  type: 'text';
}) {
  getSocket()?.emit('send_message', payload);
}

export function deleteMessage(messageId: string, chatId: string) {
  getSocket()?.emit('delete_message', { messageId, chatId });
}

export function markAsRead(messageId: string, userId: string, chatId: string) {
  getSocket()?.emit('mark_as_read', { messageId, userId, chatId });
}
