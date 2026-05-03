import { useRef, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../../services/api';
import { toast } from '../../../store/toastStore';
import { avatarUrl } from '../../../utils/avatar';
import type { User } from '../../../types';
import styles from './ProfileModal.module.css';

interface Props {
  onClose: () => void;
}

export function ProfileModal({ onClose }: Props) {
  const { user, tokens, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarSrc = user ? avatarUrl(user.avatarUrl) : null;
  const initial = user?.name.charAt(0).toUpperCase() ?? '?';

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !tokens) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const updated = await api.upload<User>('/users/me/avatar', formData, tokens.accessToken);
      setUser(updated);
      toast.success('Avatar updated');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to upload avatar');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!tokens || !name.trim() || name === user?.name) {
      onClose();
      return;
    }

    setSavingName(true);
    try {
      const updated = await api.patch<User>('/users/me', { name: name.trim() }, tokens.accessToken);
      setUser(updated);
      toast.success('Profile updated');
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update profile');
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Edit profile</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.avatarSection}>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Change profile photo"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt={user?.name ?? ''} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>{initial}</div>
            )}
            <span className={styles.avatarOverlay}>{uploading ? '...' : '📷'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className={styles.fileInput}
            onChange={handleAvatarPick}
          />
          <p className={styles.hint}>Click to change photo · PNG, JPG, GIF, WebP up to 5MB</p>
        </div>

        <form className={styles.form} onSubmit={handleSaveName}>
          <div className={styles.field}>
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
            />
          </div>

          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={user?.email ?? ''} disabled />
          </div>

          <button className={styles.submit} type="submit" disabled={savingName || !name.trim()}>
            {savingName ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}
