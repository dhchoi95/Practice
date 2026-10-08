'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
export default function Invite() {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function accept(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const data = new FormData(e.currentTarget);
    try {
      const token = new URLSearchParams(location.search).get('token');
      if (!token)
        throw Error(
          '초대 링크가 올바르지 않습니다. 사장님에게 새 링크를 요청하세요.',
        );
      const res = await fetch('/api/auth/invitations/accept', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          name: data.get('name'),
          password: data.get('password'),
        }),
      });
      const out = await res.json();
      if (!res.ok)
        throw Error(
          out.error === 'invalid invitation'
            ? '초대가 만료됐거나 이미 사용됐습니다.'
            : out.error === 'account already exists; sign in'
              ? '이미 등록된 계정입니다. 로그인해 주세요.'
              : '초대를 처리하지 못했습니다. 입력 정보를 확인해 주세요.',
        );
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <section className="card" style={{ width: 'min(100%,440px)' }}>
        <p className="eyebrow">BURGER MANAGER</p>
        <h1>매장 초대 수락</h1>
        {done ? (
          <>
            <p>계정이 준비됐습니다. 등록한 이메일과 비밀번호로 로그인하세요.</p>
            <Link className="btn" href="/login">
              로그인으로 이동
            </Link>
          </>
        ) : (
          <form className="stack" onSubmit={accept}>
            <p className="muted">
              직원 계정을 설정해 주세요. 초대 링크는 한 번만 사용할 수 있습니다.
            </p>
            <label className="label">
              이름
              <input
                className="field"
                name="name"
                autoComplete="name"
                required
                maxLength={80}
              />
            </label>
            <label className="label">
              새 비밀번호 (12자 이상)
              <input
                className="field"
                name="password"
                type="password"
                minLength={12}
                autoComplete="new-password"
                required
              />
            </label>
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            <button className="btn" disabled={busy}>
              {busy ? '설정 중…' : '계정 설정'}
            </button>
            <Link className="muted" href="/login">
              이미 계정이 있나요? 로그인
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}
