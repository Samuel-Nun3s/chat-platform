import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { toast } from '../../store/toastStore';
import type { AuthTokens, User } from '../../types';
import styles from './AuthPage.module.css';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const tokens = await api.post<AuthTokens>(
        `/auth/${mode}`,
        mode === 'register' ? { name, email, password } : { email, password }
      );
      const user = await api.get<User>('/users/me', tokens.accessToken);
      setAuth(user, tokens);
      toast.success(mode === 'register' ? 'Bem-vindo a bordo.' : 'Bem-vindo de volta.');
    } catch (err: any) {
      toast.error(err.message ?? 'Algo deu errado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.atmosphere} aria-hidden />

      <aside className={styles.brand}>
        <div className={styles.brandTop}>
          <div className={styles.mark}>
            <span className={styles.markGlyph}>✱</span>
            <span className={styles.markName}>Accord</span>
          </div>
        </div>

        <div className={styles.statement}>
          <p className={styles.eyebrow}>—  Uma plataforma de correspondência</p>
          <h1 className={styles.headline}>
            Conversas tranquilas,
            <br />
            trocadas com <em>cuidado</em>.
          </h1>
          <p className={styles.lede}>
            Mensagens em tempo real com a calma de uma carta privada. Presença,
            confirmações de leitura e grupos — sem o ruído.
          </p>
        </div>

        <div className={styles.brandFoot}>
        </div>
      </aside>

      <main className={styles.panel}>
        <div className={styles.panelInner}>
          <header className={styles.panelHead}>
            <h2 className={styles.panelTitle}>
              {mode === 'login' ? 'Entre.' : 'Comece um capítulo.'}
            </h2>
            <p className={styles.panelSub}>
              {mode === 'login'
                ? 'Acesse para continuar suas conversas.'
                : 'Crie uma conta para começar a escrever.'}
            </p>
          </header>

          <div className={styles.tabs} role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'login'}
              className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              onClick={() => setMode('login')}
            >
              Entrar
            </button>
            <button
              role="tab"
              aria-selected={mode === 'register'}
              className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
              onClick={() => setMode('register')}
            >
              Cadastrar
            </button>
            <span
              className={styles.tabIndicator}
              data-mode={mode}
              aria-hidden
            />
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className={styles.field}>
                <label htmlFor="auth-name">Nome</label>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className={styles.field}>
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="auth-pass">Senha</label>
              <input
                id="auth-pass"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <button className={styles.submit} type="submit" disabled={loading}>
              <span>{loading ? 'Um momento…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</span>
              <span className={styles.submitArrow} aria-hidden>→</span>
            </button>
          </form>

          <p className={styles.fineprint}>
            Ao continuar, você concorda com nossos termos — embora, na verdade,
            não haja nenhum. Este é um projeto pessoal.
          </p>
        </div>
      </main>
    </div>
  );
}
