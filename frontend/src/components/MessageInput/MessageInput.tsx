import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { sendMessage } from '../../hooks/useSocket';
import styles from './MessageInput.module.css';

export function MessageInput() {
  const [text, setText] = useState('');
  const { user } = useAuthStore();
  const { activeChatId } = useChatStore();

  function handleSend() {
    if (!text.trim() || !activeChatId || !user) return;

    sendMessage({
      chatId: activeChatId,
      senderId: user.id,
      content: text.trim(),
      type: 'text',
    });

    setText('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!activeChatId) return null;

  return (
    <div className={styles.container}>
      <textarea
        className={styles.input}
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
      />
      <button
        className={styles.sendBtn}
        onClick={handleSend}
        disabled={!text.trim()}
      >
        ➤
      </button>
    </div>
  );
}
