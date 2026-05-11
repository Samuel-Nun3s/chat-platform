import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useSocket } from '../../hooks/useSocket';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { ChatWindow } from '../../components/ChatWindow/ChatWindow';
import { MessageInput } from '../../components/MessageInput/MessageInput';
import styles from './ChatPage.module.css';

export function ChatPage() {
  const tokens = useAuthStore((s) => s.tokens);
  const activeChatId = useChatStore((s) => s.activeChatId);
  useSocket(tokens?.accessToken);

  return (
    <div className={`${styles.layout} ${activeChatId ? styles.hasActive : ''}`}>
      <div className={styles.sidebarSlot}>
        <Sidebar />
      </div>
      <div className={styles.main}>
        <ChatWindow />
        <MessageInput />
      </div>
    </div>
  );
}
