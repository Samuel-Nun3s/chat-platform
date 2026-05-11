import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findOrCreatePrivateChat } from './privateChat';
import type { ChatMember } from '../types';

vi.mock('./api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from './api';

function buildChat(overrides: Partial<ChatMember> & {
  chatId: string;
  members: { userId: string }[];
  type?: 'private' | 'group';
}): ChatMember {
  return {
    id: `m-${overrides.chatId}`,
    chatId: overrides.chatId,
    userId: 'me',
    role: 'member',
    joinedAt: '2026-01-01',
    chat: {
      id: overrides.chatId,
      type: overrides.type ?? 'private',
      name: null,
      avatarUrl: null,
      createdAt: '2026-01-01',
      members: overrides.members.map((m) => ({
        id: `cm-${m.userId}`,
        chatId: overrides.chatId,
        userId: m.userId,
        role: 'member',
        joinedAt: '2026-01-01',
        chat: {} as any,
      })),
    },
  } as ChatMember;
}

describe('findOrCreatePrivateChat', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockReset();
  });

  it('returns the existing private chat without hitting the API when one already exists locally', async () => {
    const existing = buildChat({
      chatId: 'c-existing',
      members: [{ userId: 'me' }, { userId: 'target' }],
    });

    const result = await findOrCreatePrivateChat('me', 'target', [existing], 'token');

    expect(result).toEqual({ chatId: 'c-existing', isNew: false, chats: [existing] });
    expect(api.post).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('does not match a private chat that has the same users but a different member set', async () => {
    const threePeople = buildChat({
      chatId: 'c-three',
      members: [{ userId: 'me' }, { userId: 'target' }, { userId: 'other' }],
    });
    vi.mocked(api.post).mockResolvedValue({ id: 'c-new' });
    vi.mocked(api.get).mockResolvedValue([]);

    const result = await findOrCreatePrivateChat('me', 'target', [threePeople], 'token');

    expect(result.isNew).toBe(true);
    expect(result.chatId).toBe('c-new');
  });

  it('does not match a group chat between the same users', async () => {
    const group = buildChat({
      chatId: 'c-group',
      type: 'group',
      members: [{ userId: 'me' }, { userId: 'target' }],
    });
    vi.mocked(api.post).mockResolvedValue({ id: 'c-new' });
    vi.mocked(api.get).mockResolvedValue([]);

    const result = await findOrCreatePrivateChat('me', 'target', [group], 'token');

    expect(result.isNew).toBe(true);
  });

  it('creates a private chat and adds the target as member when no existing match', async () => {
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/chats') return { id: 'c-new' };
      return undefined;
    });
    vi.mocked(api.get).mockResolvedValue([{ id: 'fresh' } as any]);

    const result = await findOrCreatePrivateChat('me', 'target', [], 'token');

    expect(api.post).toHaveBeenCalledWith('/chats', { type: 'private' }, 'token');
    expect(api.post).toHaveBeenCalledWith(
      '/chats/c-new/members',
      { userId: 'target', role: 'member' },
      'token',
    );
    expect(api.get).toHaveBeenCalledWith('/chats', 'token');
    expect(result).toEqual({ chatId: 'c-new', isNew: true, chats: [{ id: 'fresh' }] });
  });
});
