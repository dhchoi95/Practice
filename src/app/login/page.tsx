'use client';
import { FormEvent, useState } from 'react';
export default function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: f.get('email'),
          password: f.get('password'),
        }),
      });
      if (!r.ok) {
        setError(
          r.status === 429
            ? '시도가 많습니다. 잠시 후 다시 로그인해 주세요.'
            : '이메일과 비밀번호를 확인해 주세요.',
        );
        return;
      }
      location.href = '/';
    } catch {
      setError('서버에 연결하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-shell">
      <section className="login-story">
        <div className="burger-art" aria-hidden>
          🍔
        </div>
        <h1>
          맛있는 하루,
          <br />
          든든한 매장 관리.
        </h1>
        <p>
          판매부터 재고, 예약과 시설까지.
          <br />
          가게의 하루를 한곳에서 정리하세요.
        </p>
        <div className="row">
          <span className="badge">하루 합산 판매</span>
          <span className="badge">자동 재고 차감</span>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={login}>
          <div>
            <p className="eyebrow">BURGER MANAGER</p>
            <h1>우리 가게에 로그인</h1>
            <p className="muted">초대받은 사장님과 직원만 이용할 수 있어요.</p>
          </div>
          <label className="label">
            이메일
            <input
              className="field"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="you@example.com"
            />
          </label>
          <label className="label">
            비밀번호
            <input
              className="field"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <button className="btn" disabled={busy}>
            {busy ? '로그인 중…' : '로그인'}
          </button>
          <p className="footer-note">
            매출과 비용은 사장님 계정에서 관리합니다.
            <br />
            직원은 허용된 매장 운영 기능을 사용할 수 있습니다.
          </p>
        </form>
      </section>
    </main>
  );
}
