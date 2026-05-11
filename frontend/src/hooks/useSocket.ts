import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { toast } from '../store/toastStore';
import { api } from '../services/api';
import type { Message, ReadReceipt } from '../types';

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

      if (message.senderId !== user?.id) {
        socket.emit('mark_as_delivered', { messageId: message.id, chatId: message.chatId });
        if (message.chatId !== activeChatId) {
          incrementUnread(message.chatId);
        } else {
          socket.emit('mark_as_read', { messageId: message.id, chatId: message.chatId });
        }
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

    socket.on('message_delivered', (payload: ReadReceipt & { chatId: string }) => {
      useChatStore.getState().upsertReceipt(payload.chatId, payload);
    });

    socket.on('message_read', (payload: ReadReceipt & { chatId: string }) => {
      useChatStore.getState().upsertReceipt(payload.chatId, payload);
    });

    socket.on('chat_left', ({ chatId }: { chatId: string }) => {
      useChatStore.getState().removeChat(chatId);
      toast.info('Você foi removido(a) de uma conversa');
    });

    return () => {
      socket.off('connect');
      socket.off('new_message');
      socket.off('new_chat');
      socket.off('message_deleted');
      socket.off('message_delivered');
      socket.off('message_read');
      socket.off('chat_left');
      disconnectSocket();
    };
  }, [token]);
}

export function joinChat(chatId: string) {
  getSocket()?.emit('join_chat', chatId);
}

export function sendMessage(payload: {
  chatId: string;
  content: string;
  type: 'text';
}) {
  getSocket()?.emit('send_message', payload);
}

export function deleteMessage(messageId: string, chatId: string) {
  getSocket()?.emit('delete_message', { messageId, chatId });
}

export function markChatAsRead(chatId: string) {
  getSocket()?.emit('mark_chat_as_read', { chatId });
}
