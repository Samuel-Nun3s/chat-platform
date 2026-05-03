import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore } from '../../../store/chatStore';
import { api } from '../../../services/api';
import { joinChat } from '../../../hooks/useSocket';
import { toast } from '../../../store/toastStore';
import type { User } from '../../../types';
import styles from './NewChatModal.module.css';

interface Props {
  onClose: () => void;
}

export function NewChatModal({ onClose }: Props) {
  const [type, setType] = useState<'group' | 'private'>('group');
  const [groupName, setGroupName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const { tokens, user: me } = useAuthStore();
  const { setChats } = useChatStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!tokens) return;
      setSearching(true);
      try {
        const users = await api.get<User[]>(`/users/search?q=${encodeURIComponent(query)}`, tokens.accessToken);
        setResults(users.filter((u) => u.id !== me?.id && !selected.some((s) => s.id === u.id)));
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query]);

  function selectUser(user: User) {
    if (type === 'private') {
      setSelected([user]);
    } else {
      setSelected((prev) => [...prev, user]);
    }
    setResults([]);
    setQuery('');
  }

  function removeUser(userId: string) {
    setSelected((prev) => prev.filter((u) => u.id !== userId));
  }

  function handleTypeChange(newType: 'group' | 'private') {
    setType(newType);
    setSelected([]);
    setResults([]);
    setQuery('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!tokens) return;

    if (type === 'private' && selected.length === 0) {
      toast.error('Select a user to start a private chat');
      return;
    }
    if (type === 'group' && !groupName.trim()) {
      toast.error('Enter a group name');
      return;
    }

    setLoading(true);
    try {
      const chat = await api.post<{ id: string }>('/chats', {
        type,
        name: type === 'group' ? groupName : undefined,
      }, tokens.accessToken);

      await Promise.all(
        selected.map((u) =>
          api.post(`/chats/${chat.id}/members`, { userId: u.id, role: 'member' }, tokens.accessToken)
        )
      );

      const chats = await api.get<any[]>('/chats', tokens.accessToken);
      setChats(chats);
      joinChat(chat.id);
      toast.success('Chat created!');
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create chat');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = selected.length >= 1 && (type === 'group' ? groupName.trim().length > 0 : true);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>New Conversation</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.typeToggle}>
            <button
              type="button"
              className={`${styles.typeBtn} ${type === 'group' ? styles.typeBtnActive : ''}`}
              onClick={() => handleTypeChange('group')}
            >
              Group
            </button>
            <button
              type="button"
              className={`${styles.typeBtn} ${type === 'private' ? styles.typeBtnActive : ''}`}
              onClick={() => handleTypeChange('private')}
            >
              Private
            </button>
          </div>

          {type === 'group' && (
            <div className={styles.field}>
              <label>Group name</label>
              <input
                type="text"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div className={styles.field}>
            <label>{type === 'private' ? 'Find user' : 'Add members'}</label>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus={type === 'private'}
                disabled={type === 'private' && selected.length === 1}
              />
              {searching && <span className={styles.spinner} />}
            </div>

            {results.length > 0 && (
              <ul className={styles.results}>
                {results.map((u) => (
                  <li key={u.id}>
                    <button type="button" className={styles.resultItem} onClick={() => selectUser(u)}>
                      <div className={styles.resultAvatar}>{u.name.charAt(0).toUpperCase()}</div>
                      <div className={styles.resultInfo}>
                        <span className={styles.resultName}>{u.name}</span>
                        <span className={styles.resultEmail}>{u.email}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selected.length > 0 && (
              <div className={styles.chips}>
                {selected.map((u) => (
                  <span key={u.id} className={styles.chip}>
                    {u.name}
                    <button type="button" onClick={() => removeUser(u.id)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button className={styles.submit} type="submit" disabled={loading || !canSubmit}>
            {loading ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  );
}
