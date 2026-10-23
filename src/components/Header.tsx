'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect,useRef,useState } from 'react';
import { categories,siteConfig } from '@/config/site';
import { LiveDate } from './LiveDate';
export function Header(){
  const [open,setOpen]=useState(false);
  const button=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null);
  const path=usePathname();
  function trapFocus(event:React.KeyboardEvent<HTMLDialogElement>){
    if(event.key!=='Tab')return;
    const targets=dialog.current?.querySelectorAll<HTMLAnchorElement|HTMLButtonElement>('a[href],button:not(:disabled)');
    if(!targets?.length)return;
    const first=targets[0],last=targets[targets.length-1];
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  useEffect(()=>{
    const el=dialog.current;if(!el)return;
    if(open){el.showModal();}else if(el.open){el.close();button.current?.focus();}
  },[open]);
  return <>
    <a className="skip-link" href="#main">본문 바로가기</a>
    <header className="site-header"><div className="header-inner wrap">
      <Link prefetch={false} className="brand" href="/" aria-label={`${siteConfig.name} 사주와 생활 이야기 홈`}><svg className="brand-seal" aria-hidden="true" viewBox="0 0 32 37"><path d="M10 9h13v20H10Zm0 10h13" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg><span>{siteConfig.name}</span><span className="brand-caption">사주와 생활 이야기</span></Link>
      <div className="header-right"><span className="header-date"><LiveDate /> <span>한국시간</span></span><button className="menu-button" ref={button} aria-expanded={open} aria-controls="all-menu" onClick={()=>setOpen(true)}><span className="hamburger" aria-hidden="true">☰</span> 메뉴</button></div>
    </div></header>
    <nav className="primary-nav" aria-label="상단 분류"><div className="wrap">{[['/fortune/saju/','사주풀이'],['/fortune/day/','오늘 운세'],['/fortune/date/','지정일 운세'],['/fortune/zodiac/','가벼운 운세']].map(([href,label])=><Link prefetch={false} key={href} href={href} className={path===href||path===href.slice(0,-1)?'active':''} aria-current={path===href||path===href.slice(0,-1)?'page':undefined}>{label}</Link>)}</div></nav>
    <dialog id="all-menu" ref={dialog} aria-labelledby="all-menu-title" className="menu-dialog" onKeyDown={trapFocus} onCancel={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}><div className="menu-sheet"><div className="menu-title"><h2 id="all-menu-title">전체 메뉴</h2><button className="button quiet" autoFocus onClick={()=>setOpen(false)}>닫기 <span aria-hidden="true">×</span></button></div><div className="menu-links">{categories.map(c=><Link prefetch={false} key={c.slug} href={`/fortune/${c.slug}/`} onClick={()=>setOpen(false)}>{c.name}<span aria-hidden="true">↗</span></Link>)}</div><div className="menu-bottom">{[['guide','이용안내'],['glossary','용어사전'],['privacy','개인정보 안내']].map(([slug,label])=><Link prefetch={false} href={`/${slug}/`} key={slug} onClick={()=>setOpen(false)}>{label}</Link>)}</div></div></dialog>
  </>;
}
