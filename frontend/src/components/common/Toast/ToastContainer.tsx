import { Toast } from './Toast';
import { useToastStore } from '../../../store/toastStore';
import styles from './ToastContainer.module.css';

export function ToastContainer() {
  const { toasts, remove } = useToastStore();

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={remove} />
      ))}
    </div>
  );
}
