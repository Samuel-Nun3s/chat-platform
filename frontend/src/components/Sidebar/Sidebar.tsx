import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { api } from '../../services/api';
import { joinChat } from '../../hooks/useSocket';
import { NewChatModal } from '../common/NewChatModal/NewChatModal';
import { ProfileModal } from '../common/ProfileModal/ProfileModal';
import { avatarUrl } from '../../utils/avatar';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const { user, tokens, logout } = useAuthStore();
  const { chats, activeChatId, messages, unreadCounts, lastActivity, setChats, setActiveChat, clearUnread } = useChatStore();
  const [showNewChat, setShowNewChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState('');

  const myAvatar = avatarUrl(user?.avatarUrl);

  useEffect(() => {
    if (!tokens) return;
    api.get<any[]>('/chats', tokens.accessToken).then((chats) => {
      setChats(chats);
      chats.forEach((member) => joinChat(member.chatId));
    });
  }, [tokens]);

  function handleSelectChat(chatId: string) {
    setActiveChat(chatId);
    clearUnread(chatId);
    joinChat(chatId);
  }

  function getChatName(member: any) {
    if (member.chat.type === 'private') {
      const other = member.chat.members?.find((m: any) => m.userId !== user?.id);
      return other?.user?.name ?? 'Private Chat';
    }
    return member.chat.name ?? 'Group';
  }

  function getChatInitial(member: any) {
    return getChatName(member).charAt(0).toUpperCase();
  }

  function getChatAvatar(member: any): string | null {
    if (member.chat.type === 'private') {
      const other = member.chat.members?.find((m: any) => m.userId !== user?.id);
      return avatarUrl(other?.user?.avatarUrl);
    }
    return avatarUrl(member.chat.avatarUrl);
  }

  function getLastMessage(chatId: string): string {
    const list = messages[chatId];
    if (!list || list.length === 0) return '';
    const last = list[list.length - 1];
    return last.content.length > 38 ? `${last.content.slice(0, 38)}…` : last.content;
  }

  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => {
      const aTime = lastActivity[a.chatId] ?? a.chat.createdAt;
      const bTime = lastActivity[b.chatId] ?? b.chat.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [chats, lastActivity]);

  const visibleChats = useMemo(() => {
    if (!search.trim()) return sortedChats;
    const q = search.toLowerCase();
    return sortedChats.filter((m) => getChatName(m).toLowerCase().includes(q));
  }, [sortedChats, search]);

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <button className={styles.profile} onClick={() => setShowProfile(true)} title="Edit profile">
          {myAvatar ? (
            <img src={myAvatar} alt={user?.name ?? ''} className={styles.avatar} />
          ) : (
            <div className={styles.avatar}>{user?.name.charAt(0).toUpperCase()}</div>
          )}
          <span className={styles.username}>{user?.name}</span>
        </button>
        <div className={styles.actions}>
          <button
            className={styles.newChat}
            onClick={() => setShowNewChat(true)}
            title="New conversation"
          >
            +
          </button>
          <button className={styles.logout} onClick={logout} title="Logout">
            ⎋
          </button>
        </div>
      </div>

      <div className={styles.search}>
        <input
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.list}>
        {visibleChats.length === 0 && (
          <p className={styles.empty}>
            {chats.length === 0 ? 'No conversations yet' : 'No matches'}
          </p>
        )}
        {visibleChats.map((member) => {
          const unread = unreadCounts[member.chatId] ?? 0;
          const preview = getLastMessage(member.chatId);
          const chatImg = getChatAvatar(member);
          return (
            <button
              key={member.id}
              className={`${styles.chatItem} ${activeChatId === member.chatId ? styles.chatItemActive : ''}`}
              onClick={() => handleSelectChat(member.chatId)}
            >
              {chatImg ? (
                <img src={chatImg} alt={getChatName(member)} className={styles.chatAvatar} />
              ) : (
                <div className={styles.chatAvatar}>{getChatInitial(member)}</div>
              )}
              <div className={styles.chatInfo}>
                <span className={`${styles.chatName} ${unread > 0 ? styles.chatNameUnread : ''}`}>
                  {getChatName(member)}
                </span>
                <span className={styles.chatPreview}>
                  {preview || member.chat.type}
                </span>
              </div>
              {unread > 0 && (
                <span className={styles.unreadBadge}>{unread > 99 ? '99+' : unread}</span>
              )}
            </button>
          );
        })}
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}
