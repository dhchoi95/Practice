import Link from 'next/link';
import { Illustration } from '@/components/Illustration';
export const metadata={title:'페이지를 찾을 수 없어요',robots:{index:false,follow:true}};
export default function NotFound(){return <main id="main" className="reading-width not-found"><section className="empty-state"><Illustration name="moon"/><h1>이 페이지를 찾을 수 없어요</h1><p>주소가 바뀌었거나 없는 운세 메뉴예요.<br/>홈에서 궁금한 풀이를 다시 골라보세요.</p><Link prefetch={false} href="/" className="button primary">홈으로 돌아가기</Link><nav className="action-row" aria-label="다시 찾아보기"><Link className="button" href="/fortune/day/">오늘의 운세 보기</Link><Link className="button" href="/fortune/date/">지정일 운세 보기</Link><Link className="button" href="/guide/">이용 방법 보기</Link></nav></section></main>;}
