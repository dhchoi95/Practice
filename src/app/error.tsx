'use client';
import Link from 'next/link';
export default function ErrorPage({reset}:{reset:()=>void}){return <main id="main" className="reading-width"><section className="empty-state"><h1>화면을 불러오지 못했어요</h1><p>연결을 확인하고 다시 시도해 주세요. 계속되지 않으면 홈에서 다시 시작할 수 있어요.</p><div className="action-row"><button className="button primary" onClick={reset}>다시 시도하기</button><Link prefetch={false} className="button" href="/">홈으로</Link></div></section></main>;}
