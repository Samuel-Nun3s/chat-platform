import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { ChatWindow } from '../../components/ChatWindow/ChatWindow';
import { MessageInput } from '../../components/MessageInput/MessageInput';
import styles from './ChatPage.module.css';

export function ChatPage() {
  const tokens = useAuthStore((s) => s.tokens);
  useSocket(tokens?.accessToken);

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <ChatWindow />
        <MessageInput />
      </div>
    </div>
  );
}
