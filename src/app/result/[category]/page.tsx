import Link from 'next/link';
import { notFound } from 'next/navigation';
import {pageMetadata} from '@/lib/metadata';
import { categories,getCategory } from '@/config/site';
import { FortuneResult } from '@/components/FortuneResult';
export const dynamicParams=false;
export async function generateMetadata({params}:{params:Promise<{category:string}>}){const c=getCategory((await params).category);return pageMetadata(`${c?.name??'운세'} 풀이`,'개인 풀이 결과는 현재 브라우저에서만 확인할 수 있어요. 공유 링크에는 개인 결과를 넣지 않아요.',c?`/fortune/${c.slug}/`:'/',false);}
export function generateStaticParams(){return categories.map(c=>({category:c.slug}));}
export default async function ResultPage({params}:{params:Promise<{category:string}>}){
  const c=getCategory((await params).category);if(!c)notFound();
  return <main id="main" className="reading-width result-page"><nav className="breadcrumb" aria-label="현재 위치"><Link prefetch={false} href="/">홈</Link><span aria-hidden="true">/</span><Link prefetch={false} href={`/fortune/${c.slug}/`}>{c.name}</Link><span aria-hidden="true">/</span><span>풀이 결과</span></nav><h1 id="result-title" tabIndex={-1}>{c.name} 풀이</h1><FortuneResult key={c.slug} category={c}/></main>;
}
