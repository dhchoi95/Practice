import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { categories,getCategory,siteConfig } from '@/config/site';
import { Illustration } from '@/components/Illustration';
import { FortuneEntry } from '@/components/FortuneEntry';
export const dynamicParams=false;
export function generateStaticParams(){return categories.map(c=>({category:c.slug}));}
export async function generateMetadata({params}:{params:Promise<{category:string}>}):Promise<Metadata>{
  const c=getCategory((await params).category);return {title:c?.name??'운세 찾기',description:c?.description,...(c&&siteConfig.url?{alternates:{canonical:`${siteConfig.url}/fortune/${c.slug}/`}}:{})};
}
export default async function FortunePage({params}:{params:Promise<{category:string}>}){
  const c=getCategory((await params).category);if(!c)notFound();
  return <main id="main" className="reading-width"><div className="breadcrumb"><Link prefetch={false} href="/">홈</Link><span aria-hidden="true">/</span><span>{c.name}</span></div><header className="page-heading"><div><span className="pill-label">{c.system==='saju'?'무료 사주풀이':'가벼운 운세 이야기'}</span><h1>{c.name}</h1><p>{c.description}</p></div><Illustration name={c.icon}/></header><FortuneEntry key={c.slug} category={c}/></main>;
}
