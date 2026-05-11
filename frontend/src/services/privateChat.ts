import { api } from './api';
import type { ChatMember } from '../types';

export async function findOrCreatePrivateChat(
  myUserId: string,
  targetUserId: string,
  chats: ChatMember[],
  accessToken: string,
): Promise<{ chatId: string; isNew: boolean; chats: ChatMember[] }> {
  const existing = chats.find((m) => {
    if (m.chat.type !== 'private') return false;
    const ids = m.chat.members?.map((x) => x.userId) ?? [];
    return ids.length === 2 && ids.includes(myUserId) && ids.includes(targetUserId);
  });

  if (existing) {
    return { chatId: existing.chatId, isNew: false, chats };
  }

  const chat = await api.post<{ id: string }>('/chats', { type: 'private' }, accessToken);
  await api.post(`/chats/${chat.id}/members`, { userId: targetUserId, role: 'member' }, accessToken);
  const updatedChats = await api.get<ChatMember[]>('/chats', accessToken);

  return { chatId: chat.id, isNew: true, chats: updatedChats };
}
