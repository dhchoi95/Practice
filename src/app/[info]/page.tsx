import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { infoPages } from '@/content/pages';
import { glossary } from '@/content/glossary';
import { siteConfig } from '@/config/site';
const keys=[...Object.keys(infoPages),'glossary'];
export const dynamicParams=false;
export function generateStaticParams(){return keys.map(info=>({info}));}
export async function generateMetadata({params}:{params:Promise<{info:string}>}):Promise<Metadata>{
  const {info}=await params;
  const page=infoPages[info as keyof typeof infoPages];
  return {title:info==='glossary'?'쉬운 명리 용어사전':page?.title,description:info==='glossary'?'사주에 처음 만나는 말들을 쉽게 풀어보세요.':page?.description.replaceAll('하루사주',siteConfig.name),...(siteConfig.url&&keys.includes(info)?{alternates:{canonical:`${siteConfig.url}/${info}/`}}:{})};
}
export default async function InfoPage({params}:{params:Promise<{info:string}>}){
  const {info}=await params;if(!keys.includes(info))notFound();
  if(info==='glossary')return <main id="main" className="reading-width"><div className="breadcrumb"><Link prefetch={false} href="/">홈</Link><span>/</span><span>용어사전</span></div><header className="page-heading"><div><span className="pill-label">처음 만나는 사주 이야기</span><h1>쉬운 명리 용어사전</h1><p>낯선 말은 잠깐 짚고, 내 경험에 맞춰 읽어보세요.</p></div></header><article className="article"><dl>{glossary.map(g=><div className="glossary-entry" id={g.key} key={g.key}><dt>{g.title}</dt><dd>{g.text}</dd></div>)}</dl></article></main>;
  const page=infoPages[info as keyof typeof infoPages];
  return <main id="main" className="reading-width"><div className="breadcrumb"><Link prefetch={false} href="/">홈</Link><span>/</span><span>{page.title}</span></div><header className="page-heading"><div><span className="pill-label">{siteConfig.name} 안내</span><h1>{page.title}</h1><p>{page.description.replaceAll('하루사주',siteConfig.name)}</p></div></header><article className="article">{page.sections.map(s=><section key={s.title}><h2>{s.title}</h2>{s.paragraphs.map((p,i)=><p key={i}>{p.replaceAll('하루사주',siteConfig.name)}</p>)}</section>)}{info==='credits'&&<section><h2>원저자 자료와 라이선스 원문</h2><ul><li><a href="https://github.com/usingsky/korean_lunar_calendar_js">한국 음양력 변환 원저자 저장소</a></li><li><a href="https://github.com/6tail/lunar-typescript">절기 자료 원저자 저장소</a></li><li><a href="https://github.com/cosinekitty/astronomy">독립 천문 비교 도구</a></li><li><a href="https://www.iana.org/time-zones">IANA 시간대 자료</a></li><li><a href="/third-party-notices.txt">오픈소스 라이선스 원문 보기</a></li></ul></section>}</article></main>;
}
