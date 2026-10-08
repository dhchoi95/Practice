'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
const navigation = [
  ['dashboard', '대시보드', '◫'],
  ['sales', '매출', '↗'],
  ['inventory', '재고', '▦'],
  ['purchasing', '발주', '▤'],
  ['reservations', '예약', '◷'],
  ['facilities', '시설', '⚙'],
  ['finance', '비용', '₩'],
  ['settings', '설정', '⚙'],
];
export default function StoreShell({
  storeId,
  role,
  name,
  children,
}: {
  storeId: string;
  role: string;
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const content = useRef<HTMLElement>(null);
  const [stores, setStores] = useState<
    { role: string; store: { id: string; name: string } }[]
  >([]);
  useEffect(() => {
    fetch('/api/me/stores')
      .then((r) => (r.ok ? r.json() : []))
      .then(setStores)
      .catch(() => {});
  }, []);
  useEffect(() => {
    menu.current?.removeAttribute('open');
    content.current?.scrollTo({ top: 0 });
  }, [pathname]);
  const owner = role === 'OWNER';
  const primary = owner
    ? ['dashboard', 'sales', 'inventory', 'reservations']
    : ['dashboard', 'inventory', 'reservations', 'facilities'];
  const allowed = navigation.filter(
    ([key]) =>
      owner || !['sales', 'finance', 'settings', 'purchasing'].includes(key),
  );
  const extra = allowed.filter(([key]) => !primary.includes(key));
  const close = () => menu.current?.removeAttribute('open');
  return (
    <div className="layout app-shell">
      <main className="main" ref={content}>
        <header className="topbar">
          <div className="app-store">
            <span className="store-symbol" aria-hidden>
              🍔
            </span>
            <div>
              <span className="app-brand">버거 매니저</span>
              {stores.length > 1 ? (
                <select
                  className="field store-switch"
                  aria-label="매장 선택"
                  value={storeId}
                  onChange={(e) =>
                    location.assign(`/${e.target.value}/dashboard`)
                  }
                >
                  {stores.map((s) => (
                    <option value={s.store.id} key={s.store.id}>
                      {s.store.name}
                    </option>
                  ))}
                </select>
              ) : (
                <strong>{stores[0]?.store.name ?? '햄버거 매장'}</strong>
              )}
            </div>
          </div>
          <div className="app-account">
            <span className="avatar" aria-label={name}>
              {name.slice(0, 1)}
            </span>
            <span>{owner ? '사장님' : '직원'}</span>
          </div>
        </header>
        {children}
      </main>
      <nav className="bottom-nav" aria-label="주요 메뉴">
        {allowed
          .filter(([key]) => primary.includes(key))
          .map(([key, label, icon]) => (
            <Link
              key={key}
              className={`tab ${pathname.endsWith('/' + key) ? 'active' : ''}`}
              aria-current={pathname.endsWith('/' + key) ? 'page' : undefined}
              href={`/${storeId}/${key}`}
            >
              <span className="tab-icon" aria-hidden>
                {icon}
              </span>
              <span>{key === 'dashboard' ? '오늘' : label}</span>
            </Link>
          ))}
        <details className="more-menu" ref={menu}>
          <summary
            className={`tab ${extra.some(([key]) => pathname.endsWith('/' + key)) ? 'active' : ''}`}
            role="button"
            aria-label="더보기"
          >
            <span className="tab-icon" aria-hidden>
              ⋯
            </span>
            <span>더보기</span>
          </summary>
          <button
            className="more-backdrop"
            onClick={close}
            aria-label="더보기 닫기"
            type="button"
          />
          <div className="more-sheet">
            <div className="sheet-handle" aria-hidden />
            <div className="section-head">
              <h2>매장 관리</h2>
              <button
                className="btn secondary small"
                type="button"
                onClick={close}
              >
                닫기
              </button>
            </div>
            <div className="more-grid">
              {extra.map(([key, label, icon]) => (
                <Link
                  href={`/${storeId}/${key}`}
                  className="more-item"
                  key={key}
                  onClick={close}
                >
                  <span aria-hidden>{icon}</span>
                  {label}
                  <span aria-hidden>›</span>
                </Link>
              ))}
            </div>
            <div className="account-note">
              <strong>{name}</strong>
              <span className="muted">{owner ? '사장님' : '직원'} 계정</span>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="btn secondary logout-button">로그아웃</button>
            </form>
          </div>
        </details>
      </nav>
    </div>
  );
}
