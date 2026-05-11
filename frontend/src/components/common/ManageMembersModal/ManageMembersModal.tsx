import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore } from '../../../store/chatStore';
import { api } from '../../../services/api';
import { toast } from '../../../store/toastStore';
import { ConfirmModal } from '../ConfirmModal/ConfirmModal';
import { avatarUrl } from '../../../utils/avatar';
import type { ChatMember, User } from '../../../types';
import styles from './ManageMembersModal.module.css';

interface Props {
  chatId: string;
  onClose: () => void;
}

export function ManageMembersModal({ chatId, onClose }: Props) {
  const { tokens, user: me } = useAuthStore();
  const { chats, setChats } = useChatStore();
  const activeChat = chats.find((c) => c.chatId === chatId);
  const isAdmin = activeChat?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [members, setMembers] = useState<ChatMember[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ChatMember | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groupAvatar = activeChat ? avatarUrl(activeChat.chat.avatarUrl) : null;
  const groupName = activeChat?.chat.name ?? 'Grupo';

  async function loadMembers() {
    if (!tokens) return;
    try {
      const list = await api.get<ChatMember[]>(`/chats/${chatId}/members`, tokens.accessToken);
      setMembers(list);
    } catch (err: any) {
      toast.error(err.message ?? 'Falha ao carregar membros');
    }
  }

  useEffect(() => {
    loadMembers();
  }, [chatId]);

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
        const memberIds = new Set(members.map((m) => m.userId));
        setResults(users.filter((u) => !memberIds.has(u.id)));
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query, members]);

  async function handleAdd(user: User) {
    if (!tokens) return;
    setAdding(user.id);
    try {
      await api.post(`/chats/${chatId}/members`, { userId: user.id, role: 'member' }, tokens.accessToken);
      await loadMembers();
      const updatedChats = await api.get<ChatMember[]>('/chats', tokens.accessToken);
      setChats(updatedChats);
      setQuery('');
      setResults([]);
      toast.success(`${user.name} adicionado(a)`);
    } catch (err: any) {
      toast.error(err.message ?? 'Falha ao adicionar membro');
    } finally {
      setAdding(null);
    }
  }

  async function handleRemove() {
    if (!confirmRemove || !tokens) return;
    const target = confirmRemove;
    try {
      await api.delete(`/chats/${chatId}/members/${target.userId}`, tokens.accessToken);
      await loadMembers();
      const updatedChats = await api.get<ChatMember[]>('/chats', tokens.accessToken);
      setChats(updatedChats);
      toast.success(`${target.user?.name ?? 'Membro'} removido(a)`);
    } catch (err: any) {
      toast.error(err.message ?? 'Falha ao remover membro');
    } finally {
      setConfirmRemove(null);
    }
  }

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !tokens) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await api.upload(`/chats/${chatId}/avatar`, formData, tokens.accessToken);
      const updatedChats = await api.get<ChatMember[]>('/chats', tokens.accessToken);
      setChats(updatedChats);
      toast.success('Foto do grupo atualizada');
    } catch (err: any) {
      toast.error(err.message ?? 'Falha ao enviar foto');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Informações do grupo</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.groupHeader}>
          <button
            type="button"
            className={styles.groupAvatarBtn}
            onClick={() => isAdmin && fileInputRef.current?.click()}
            disabled={!isAdmin || uploadingAvatar}
            title={isAdmin ? 'Trocar foto do grupo' : ''}
          >
            {groupAvatar ? (
              <img src={groupAvatar} alt={groupName} className={styles.groupAvatar} />
            ) : (
              <div className={styles.groupAvatarFallback}>{groupName.charAt(0).toUpperCase()}</div>
            )}
            {isAdmin && (
              <span className={styles.groupAvatarOverlay}>{uploadingAvatar ? '…' : '📷'}</span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className={styles.fileInput}
            onChange={handleAvatarPick}
          />
          <span className={styles.groupName}>{groupName}</span>
          <span className={styles.groupMeta}>{members.length} {members.length === 1 ? 'membro' : 'membros'}</span>
        </div>

        {isAdmin && (
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Adicionar membros</label>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="Buscar por nome ou email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {searching && <span className={styles.spinner} />}
            </div>
            {results.length > 0 && (
              <ul className={styles.results}>
                {results.map((u) => {
                  const img = avatarUrl(u.avatarUrl);
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        className={styles.resultItem}
                        onClick={() => handleAdd(u)}
                        disabled={adding === u.id}
                      >
                        {img ? (
                          <img src={img} alt={u.name} className={styles.resultAvatar} />
                        ) : (
                          <div className={styles.resultAvatar}>{u.name.charAt(0).toUpperCase()}</div>
                        )}
                        <div className={styles.resultInfo}>
                          <span className={styles.resultName}>{u.name}</span>
                          <span className={styles.resultEmail}>{u.email}</span>
                        </div>
                        <span className={styles.addBtn}>{adding === u.id ? '…' : '+'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <div className={styles.section}>
          <label className={styles.sectionLabel}>Membros ({members.length})</label>
          <ul className={styles.memberList}>
            {members.map((m) => {
              const u = m.user;
              const img = u ? avatarUrl(u.avatarUrl) : null;
              const isMe = m.userId === me?.id;
              const canRemove = isAdmin && !isMe;
              const roleLabel = m.role === 'admin' ? 'admin' : 'membro';
              return (
                <li key={m.id} className={styles.memberItem}>
                  {img ? (
                    <img src={img} alt={u?.name ?? ''} className={styles.memberAvatar} />
                  ) : (
                    <div className={styles.memberAvatar}>
                      {(u?.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={styles.memberInfo}>
                    <span className={styles.memberName}>
                      {u?.name ?? 'Desconhecido'}{isMe ? ' (você)' : ''}
                    </span>
                    <span className={styles.memberRole}>{roleLabel}</span>
                  </div>
                  {canRemove && (
                    <button
                      className={styles.removeBtn}
                      onClick={() => setConfirmRemove(m)}
                      title="Remover membro"
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmRemove}
        title="Remover membro"
        message={`Remover ${confirmRemove?.user?.name ?? 'este membro'} do grupo?`}
        confirmLabel="Remover"
        danger
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
