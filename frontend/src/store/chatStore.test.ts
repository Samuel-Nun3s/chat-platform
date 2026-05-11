import { beforeEach, describe, expect, it } from 'vitest';
import { useChatStore } from './chatStore';
import type { ChatMember, Message, ReadReceipt } from '../types';

function chatMember(overrides: Partial<ChatMember> & { chatId: string; chat: Partial<ChatMember['chat']> }): ChatMember {
  return {
    id: `m-${overrides.chatId}`,
    chatId: overrides.chatId,
    userId: 'me',
    role: 'member',
    joinedAt: '2026-01-01T00:00:00.000Z',
    chat: {
      id: overrides.chatId,
      type: 'group',
      name: 'Group',
      avatarUrl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      members: [],
      ...overrides.chat,
    } as ChatMember['chat'],
    ...overrides,
  } as ChatMember;
}

function message(overrides: Partial<Message> & { id: string; chatId: string }): Message {
  return {
    id: overrides.id,
    chatId: overrides.chatId,
    senderId: 'sender',
    content: 'hi',
    type: 'text',
    createdAt: '2026-05-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      chats: [],
      activeChatId: null,
      messages: {},
      unreadCounts: {},
      lastActivity: {},
    });
  });

  describe('addMessage', () => {
    it('appends the message and bumps lastActivity for the chat', () => {
      useChatStore.getState().addMessage(message({ id: 'm1', chatId: 'c1', createdAt: '2026-05-10T12:00:00.000Z' }));

      const state = useChatStore.getState();
      expect(state.messages['c1']).toHaveLength(1);
      expect(state.lastActivity['c1']).toBe('2026-05-10T12:00:00.000Z');
    });

    it('appends to an existing message list', () => {
      const m1 = message({ id: 'm1', chatId: 'c1' });
      const m2 = message({ id: 'm2', chatId: 'c1', content: 'second' });

      useChatStore.getState().addMessage(m1);
      useChatStore.getState().addMessage(m2);

      expect(useChatStore.getState().messages['c1']).toEqual([m1, m2]);
    });
  });

  describe('removeMessage', () => {
    it('filters the deleted message out of the list', () => {
      useChatStore.setState({
        messages: {
          c1: [message({ id: 'm1', chatId: 'c1' }), message({ id: 'm2', chatId: 'c1' })],
        },
      });

      useChatStore.getState().removeMessage('c1', 'm1');

      const list = useChatStore.getState().messages['c1'];
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('m2');
    });
  });

  describe('unread counts', () => {
    it('increments per chat independently', () => {
      const { incrementUnread } = useChatStore.getState();
      incrementUnread('c1');
      incrementUnread('c1');
      incrementUnread('c2');

      expect(useChatStore.getState().unreadCounts).toEqual({ c1: 2, c2: 1 });
    });

    it('clearUnread removes the chat key entirely', () => {
      useChatStore.setState({ unreadCounts: { c1: 3, c2: 1 } });

      useChatStore.getState().clearUnread('c1');

      expect(useChatStore.getState().unreadCounts).toEqual({ c2: 1 });
    });

    it('clearUnread is a no-op when the chat has no unread count', () => {
      const before = useChatStore.getState();
      useChatStore.getState().clearUnread('never-existed');
      expect(useChatStore.getState().unreadCounts).toEqual(before.unreadCounts);
    });
  });

  describe('removeChat', () => {
    it('removes the chat, its messages, unread count and activity, and clears active if matching', () => {
      useChatStore.setState({
        chats: [chatMember({ chatId: 'c1', chat: {} }), chatMember({ chatId: 'c2', chat: {} })],
        activeChatId: 'c1',
        messages: { c1: [message({ id: 'm1', chatId: 'c1' })], c2: [] },
        unreadCounts: { c1: 5, c2: 1 },
        lastActivity: { c1: '2026-01-01', c2: '2026-01-02' },
      });

      useChatStore.getState().removeChat('c1');

      const state = useChatStore.getState();
      expect(state.chats.map((c) => c.chatId)).toEqual(['c2']);
      expect(state.messages.c1).toBeUndefined();
      expect(state.unreadCounts.c1).toBeUndefined();
      expect(state.lastActivity.c1).toBeUndefined();
      expect(state.activeChatId).toBeNull();
    });

    it('preserves activeChatId when a different chat is removed', () => {
      useChatStore.setState({
        chats: [chatMember({ chatId: 'c1', chat: {} }), chatMember({ chatId: 'c2', chat: {} })],
        activeChatId: 'c1',
      });

      useChatStore.getState().removeChat('c2');

      expect(useChatStore.getState().activeChatId).toBe('c1');
    });
  });

  describe('upsertReceipt', () => {
    const baseMsg = message({ id: 'm1', chatId: 'c1' });

    it('adds a receipt to the message when none exists for that user', () => {
      useChatStore.setState({ messages: { c1: [{ ...baseMsg, readReceipts: [] }] } });
      const receipt: ReadReceipt = {
        id: 'r1', messageId: 'm1', userId: 'u-other', deliveredAt: '2026-01-01', readAt: null,
      };

      useChatStore.getState().upsertReceipt('c1', receipt);

      const msg = useChatStore.getState().messages['c1'][0];
      expect(msg.readReceipts).toHaveLength(1);
      expect(msg.readReceipts?.[0]).toMatchObject({ userId: 'u-other', readAt: null });
    });

    it('updates an existing receipt by userId (e.g., delivered → read)', () => {
      useChatStore.setState({
        messages: {
          c1: [{
            ...baseMsg,
            readReceipts: [{ id: 'r1', messageId: 'm1', userId: 'u-other', deliveredAt: '2026-01-01', readAt: null }],
          }],
        },
      });

      useChatStore.getState().upsertReceipt('c1', {
        id: 'r1', messageId: 'm1', userId: 'u-other', deliveredAt: '2026-01-01', readAt: '2026-01-02',
      });

      const msg = useChatStore.getState().messages['c1'][0];
      expect(msg.readReceipts).toHaveLength(1);
      expect(msg.readReceipts?.[0].readAt).toBe('2026-01-02');
    });

    it('is a no-op when the target message is not in the store', () => {
      const before = useChatStore.getState().messages;
      useChatStore.getState().upsertReceipt('unknown', {
        id: 'r', messageId: 'mx', userId: 'u', deliveredAt: '2026-01-01', readAt: null,
      });
      expect(useChatStore.getState().messages).toBe(before);
    });
  });
});
