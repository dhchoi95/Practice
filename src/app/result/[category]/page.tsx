import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categories,getCategory } from '@/config/site';
import { FortuneResult } from '@/components/FortuneResult';
export const dynamicParams=false;
export const metadata={title:'나의 풀이',robots:{index:false,follow:false}};
export function generateStaticParams(){return categories.map(c=>({category:c.slug}));}
export default async function ResultPage({params}:{params:Promise<{category:string}>}){
  const c=getCategory((await params).category);if(!c)notFound();
  return <main id="main" className="reading-width result-page"><div className="breadcrumb"><Link prefetch={false} href="/">홈</Link><span aria-hidden="true">/</span><Link prefetch={false} href={`/fortune/${c.slug}/`}>{c.name}</Link><span aria-hidden="true">/</span><span>풀이 결과</span></div><h1 id="result-title" tabIndex={-1}>{c.name} 풀이</h1><FortuneResult key={c.slug} category={c}/></main>;
}
