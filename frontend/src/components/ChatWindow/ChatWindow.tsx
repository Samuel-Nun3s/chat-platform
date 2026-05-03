import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { api } from '../../services/api';
import { deleteMessage, markAsRead } from '../../hooks/useSocket';
import { toast } from '../../store/toastStore';
import { ConfirmModal } from '../common/ConfirmModal/ConfirmModal';
import { avatarUrl } from '../../utils/avatar';
import type { Message } from '../../types';
import styles from './ChatWindow.module.css';

export function ChatWindow() {
  const { user, tokens } = useAuthStore();
  const { activeChatId, chats, messages, setMessages, removeChat, clearUnread } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState<Message | null>(null);
  const [confirmDeleteChat, setConfirmDeleteChat] = useState(false);

  const activeChat = chats.find((c) => c.chatId === activeChatId);
  const chatMessages = activeChatId ? (messages[activeChatId] ?? []) : [];

  useEffect(() => {
    if (!activeChatId || !tokens) return;
    setMenuOpen(false);
    clearUnread(activeChatId);
    api
      .get<Message[]>(`/chats/${activeChatId}/messages`, tokens.accessToken)
      .then((msgs) => {
        setMessages(activeChatId, msgs);
        const last = msgs[msgs.length - 1];
        if (last && user && last.senderId !== user.id) {
          markAsRead(last.id, user.id, activeChatId);
        }
      })
      .catch(() => {});
  }, [activeChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!activeChatId || !user) return;
    const last = chatMessages[chatMessages.length - 1];
    if (last && last.senderId !== user.id) {
      markAsRead(last.id, user.id, activeChatId);
    }
  }, [chatMessages.length]);

  if (!activeChatId) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyContent}>
          <span className={styles.emptyIcon}>💬</span>
          <p>Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getChatName() {
    if (!activeChat) return '';
    if (activeChat.chat.type === 'private') {
      const other = activeChat.chat.members?.find((m) => m.userId !== user?.id);
      return other?.user?.name ?? 'Private Chat';
    }
    return activeChat.chat.name ?? 'Group';
  }

  function getSender(senderId: string) {
    return activeChat?.chat.members?.find((m) => m.userId === senderId)?.user;
  }

  function getHeaderAvatar(): string | null {
    if (!activeChat) return null;
    if (activeChat.chat.type === 'private') {
      const other = activeChat.chat.members?.find((m) => m.userId !== user?.id);
      return avatarUrl(other?.user?.avatarUrl);
    }
    return avatarUrl(activeChat.chat.avatarUrl);
  }

  const isGroup = activeChat?.chat.type === 'group';
  const headerAvatar = getHeaderAvatar();

  async function handleDeleteChat() {
    if (!activeChatId || !user || !tokens) return;
    try {
      await api.delete(`/chats/${activeChatId}/members/${user.id}`, tokens.accessToken);
      removeChat(activeChatId);
      toast.success('Conversation deleted');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete conversation');
    } finally {
      setConfirmDeleteChat(false);
      setMenuOpen(false);
    }
  }

  function handleConfirmDeleteMessage() {
    if (!confirmDeleteMessage) return;
    deleteMessage(confirmDeleteMessage.id, confirmDeleteMessage.chatId);
    setConfirmDeleteMessage(null);
  }

  const chatName = getChatName();

  return (
    <div className={styles.window}>
      <div className={styles.header}>
        {headerAvatar ? (
          <img src={headerAvatar} alt={chatName} className={styles.headerAvatar} />
        ) : (
          <div className={styles.headerAvatar}>
            {chatName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className={styles.headerInfo}>
          <span className={styles.headerName}>{chatName}</span>
          <span className={styles.headerType}>{activeChat?.chat.type}</span>
        </div>
        <div className={styles.headerMenu}>
          <button
            className={styles.menuBtn}
            onClick={() => setMenuOpen((v) => !v)}
            title="Options"
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)} />
              <div className={styles.menu}>
                <button
                  className={styles.menuItemDanger}
                  onClick={() => { setConfirmDeleteChat(true); setMenuOpen(false); }}
                >
                  Delete conversation
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.messages}>
        {chatMessages.map((msg, idx) => {
          const isMine = msg.senderId === user?.id;
          const sender = !isMine && isGroup ? getSender(msg.senderId) : null;
          const prevMsg = chatMessages[idx - 1];
          const showSenderHeader = !isMine && isGroup && (!prevMsg || prevMsg.senderId !== msg.senderId);
          const senderImg = sender ? avatarUrl(sender.avatarUrl) : null;
          return (
            <div
              key={msg.id}
              className={`${styles.messageRow} ${isMine ? styles.messageRowSent : ''}`}
            >
              {!isMine && isGroup && (
                <div className={styles.senderAvatarWrapper}>
                  {showSenderHeader && (
                    senderImg ? (
                      <img src={senderImg} alt={sender?.name ?? ''} className={styles.senderAvatar} />
                    ) : (
                      <div className={styles.senderAvatar}>
                        {(sender?.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                    )
                  )}
                </div>
              )}
              {isMine && (
                <button
                  className={styles.deleteBtn}
                  onClick={() => setConfirmDeleteMessage(msg)}
                  title="Delete message"
                >
                  🗑
                </button>
              )}
              <div className={`${styles.bubble} ${isMine ? styles.bubbleSent : styles.bubbleReceived}`}>
                {showSenderHeader && (
                  <span className={styles.senderName}>{sender?.name ?? 'Unknown'}</span>
                )}
                <p className={styles.bubbleText}>{msg.content}</p>
                <span className={styles.bubbleTime}>{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <ConfirmModal
        open={!!confirmDeleteMessage}
        title="Delete message"
        message="This message will be removed for everyone in the conversation. This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleConfirmDeleteMessage}
        onCancel={() => setConfirmDeleteMessage(null)}
      />

      <ConfirmModal
        open={confirmDeleteChat}
        title="Delete conversation"
        message="You will leave this conversation and lose access to its messages."
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteChat}
        onCancel={() => setConfirmDeleteChat(false)}
      />
    </div>
  );
}
