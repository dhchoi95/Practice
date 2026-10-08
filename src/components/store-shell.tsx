'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
const navigation = [
  ['dashboard', '대시보드', '◫'],
  ['sales', '매출', '↗'],
  ['inventory', '재고', '▦'],
  ['purchasing', '발주', '▤'],
  ['reservations', '예약', '◷'],
  ['facilities', '시설', '⚙'],
  ['finance', '비용', '₩'],
  ['settings', '설정', '⋯'],
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
  const [stores, setStores] = useState<
    { role: string; store: { id: string; name: string } }[]
  >([]);
  useEffect(() => {
    fetch('/api/me/stores')
      .then((r) => (r.ok ? r.json() : []))
      .then(setStores)
      .catch(() => {});
  }, []);
  const owner = role === 'OWNER';
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          🍔 버거 매니저<small>매장의 하루를 한곳에서</small>
        </div>
        {navigation
          .filter(
            ([key]) =>
              owner ||
              !['sales', 'finance', 'settings', 'purchasing'].includes(key),
          )
          .map(([key, label, icon]) => (
            <Link
              key={key}
              className={`navlink ${pathname.endsWith('/' + key) ? 'active' : ''}`}
              href={`/${storeId}/${key}`}
            >
              <span className="nav-icon" aria-hidden>
                {icon}
              </span>
              {label}
            </Link>
          ))}
        <div className="sidebar-footer">
          {owner ? '사장님' : '직원'} 계정 · 기록 기반 운영
          <form action="/api/auth/logout" method="post">
            <button type="submit">로그아웃 ↗</button>
          </form>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="row">
            <span aria-hidden>🏠</span>
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
            <span className="badge gray">{owner ? '사장님' : '직원'}</span>
          </div>
          <div className="row">
            <span className="user-name muted">{name}</span>
            <span className="avatar" aria-label={name}>
              {name.slice(0, 1)}
            </span>
            <form
              className="mobile-title"
              action="/api/auth/logout"
              method="post"
            >
              <button className="btn secondary small">나가기</button>
            </form>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
