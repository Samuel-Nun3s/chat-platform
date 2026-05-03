import { useAuthStore } from './store/authStore';
import { AuthPage } from './pages/AuthPage/AuthPage';
import { ChatPage } from './pages/ChatPage/ChatPage';
import { ToastContainer } from './components/common/Toast/ToastContainer';

export default function App() {
  const user = useAuthStore((s) => s.user);
  return (
    <>
      {user ? <ChatPage /> : <AuthPage />}
      <ToastContainer />
    </>
  );
}
