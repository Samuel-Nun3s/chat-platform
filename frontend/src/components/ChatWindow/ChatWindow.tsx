import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { api } from '../../services/api';
import { deleteMessage, joinChat, markChatAsRead } from '../../hooks/useSocket';
import { toast } from '../../store/toastStore';
import { ConfirmModal } from '../common/ConfirmModal/ConfirmModal';
import { ManageMembersModal } from '../common/ManageMembersModal/ManageMembersModal';
import { findOrCreatePrivateChat } from '../../services/privateChat';
import { avatarUrl } from '../../utils/avatar';
import type { Message, User } from '../../types';
import styles from './ChatWindow.module.css';

export function ChatWindow() {
  const { user, tokens } = useAuthStore();
  const { activeChatId, chats, messages, setMessages, setChats, setActiveChat, removeChat, clearUnread } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState<Message | null>(null);
  const [confirmDeleteChat, setConfirmDeleteChat] = useState(false);
  const [confirmStartPrivate, setConfirmStartPrivate] = useState<User | null>(null);
  const [startingPrivate, setStartingPrivate] = useState(false);
  const [showManageMembers, setShowManageMembers] = useState(false);

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
        markChatAsRead(activeChatId);
      })
      .catch(() => {});
  }, [activeChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  if (!activeChatId) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyContent}>
          <span className={styles.emptyIcon}>💬</span>
          <p>Selecione uma conversa para começar</p>
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
      return other?.user?.name ?? 'Conversa privada';
    }
    return activeChat.chat.name ?? 'Grupo';
  }

  function getSender(senderId: string) {
    return activeChat?.chat.members?.find((m) => m.userId === senderId)?.user;
  }

  function getMessageStatus(msg: Message): 'sent' | 'delivered' | 'read' {
    if (!user || !activeChat) return 'sent';
    const otherUserIds = activeChat.chat.members
      ?.filter((m) => m.userId !== user.id)
      .map((m) => m.userId) ?? [];
    if (otherUserIds.length === 0) return 'sent';
    const receipts = msg.readReceipts ?? [];
    const allRead = otherUserIds.every((uid) => receipts.some((r) => r.userId === uid && r.readAt));
    if (allRead) return 'read';
    const allDelivered = otherUserIds.every((uid) => receipts.some((r) => r.userId === uid));
    if (allDelivered) return 'delivered';
    return 'sent';
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
      toast.success(isGroup ? 'Você saiu do grupo' : 'Conversa apagada');
    } catch (err: any) {
      toast.error(err.message ?? 'Falha ao sair da conversa');
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

  async function handleStartPrivateChat() {
    if (!confirmStartPrivate || !user || !tokens) return;
    const target = confirmStartPrivate;

    setStartingPrivate(true);
    try {
      const result = await findOrCreatePrivateChat(user.id, target.id, chats, tokens.accessToken);
      setChats(result.chats);
      joinChat(result.chatId);
      clearUnread(result.chatId);
      setActiveChat(result.chatId);
      if (result.isNew) toast.success(`Conversa com ${target.name} iniciada`);
    } catch (err: any) {
      toast.error(err.message ?? 'Falha ao iniciar conversa privada');
    } finally {
      setStartingPrivate(false);
      setConfirmStartPrivate(null);
    }
  }

  const chatName = getChatName();

  return (
    <div className={styles.window}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => setActiveChat(null)}
          aria-label="Voltar para conversas"
        >
          ←
        </button>
        {headerAvatar ? (
          <img src={headerAvatar} alt={chatName} className={styles.headerAvatar} />
        ) : (
          <div className={styles.headerAvatar}>
            {chatName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className={styles.headerInfo}>
          <span className={styles.headerName}>{chatName}</span>
          <span className={styles.headerType}>
            {activeChat?.chat.type === 'private' ? 'privada' : 'grupo'}
          </span>
        </div>
        <div className={styles.headerMenu}>
          <button
            className={styles.menuBtn}
            onClick={() => setMenuOpen((v) => !v)}
            title="Opções"
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)} />
              <div className={styles.menu}>
                {isGroup && (
                  <button
                    className={styles.menuItem}
                    onClick={() => { setShowManageMembers(true); setMenuOpen(false); }}
                  >
                    Informações do grupo
                  </button>
                )}
                <button
                  className={styles.menuItemDanger}
                  onClick={() => { setConfirmDeleteChat(true); setMenuOpen(false); }}
                >
                  {isGroup ? 'Sair do grupo' : 'Apagar conversa'}
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
                  {showSenderHeader && sender && (
                    <button
                      type="button"
                      className={styles.senderAvatarBtn}
                      onClick={() => setConfirmStartPrivate(sender)}
                      title={`Iniciar conversa privada com ${sender.name}`}
                    >
                      {senderImg ? (
                        <img src={senderImg} alt={sender.name} className={styles.senderAvatar} />
                      ) : (
                        <div className={styles.senderAvatar}>
                          {sender.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </button>
                  )}
                </div>
              )}
              {isMine && (
                <button
                  className={styles.deleteBtn}
                  onClick={() => setConfirmDeleteMessage(msg)}
                  title="Apagar mensagem"
                >
                  🗑
                </button>
              )}
              <div className={`${styles.bubble} ${isMine ? styles.bubbleSent : styles.bubbleReceived}`}>
                {showSenderHeader && sender && (
                  <button
                    type="button"
                    className={styles.senderNameBtn}
                    onClick={() => setConfirmStartPrivate(sender)}
                  >
                    {sender.name}
                  </button>
                )}
                <p className={styles.bubbleText}>{msg.content}</p>
                <span className={styles.bubbleMeta}>
                  <span className={styles.bubbleTime}>{formatTime(msg.createdAt)}</span>
                  {isMine && (() => {
                    const status = getMessageStatus(msg);
                    if (status === 'read') {
                      return <span className={`${styles.ticks} ${styles.ticksRead}`} aria-label="Lida">✓✓</span>;
                    }
                    if (status === 'delivered') {
                      return <span className={styles.ticks} aria-label="Entregue">✓✓</span>;
                    }
                    return <span className={styles.ticks} aria-label="Enviada">✓</span>;
                  })()}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <ConfirmModal
        open={!!confirmDeleteMessage}
        title="Apagar mensagem"
        message="Esta mensagem será removida para todos na conversa. Isso não pode ser desfeito."
        confirmLabel="Apagar"
        danger
        onConfirm={handleConfirmDeleteMessage}
        onCancel={() => setConfirmDeleteMessage(null)}
      />

      <ConfirmModal
        open={confirmDeleteChat}
        title={isGroup ? 'Sair do grupo' : 'Apagar conversa'}
        message={isGroup
          ? 'Você sairá deste grupo e parará de receber suas mensagens. Outro membro pode te adicionar novamente depois.'
          : 'Você sairá desta conversa e perderá acesso às mensagens.'}
        confirmLabel={isGroup ? 'Sair' : 'Apagar'}
        danger
        onConfirm={handleDeleteChat}
        onCancel={() => setConfirmDeleteChat(false)}
      />

      <ConfirmModal
        open={!!confirmStartPrivate}
        title="Iniciar conversa privada"
        message={`Quer iniciar uma conversa privada com ${confirmStartPrivate?.name ?? ''}?`}
        confirmLabel={startingPrivate ? 'Abrindo…' : 'Iniciar conversa'}
        onConfirm={handleStartPrivateChat}
        onCancel={() => !startingPrivate && setConfirmStartPrivate(null)}
      />

      {showManageMembers && activeChatId && (
        <ManageMembersModal chatId={activeChatId} onClose={() => setShowManageMembers(false)} />
      )}
    </div>
  );
}
