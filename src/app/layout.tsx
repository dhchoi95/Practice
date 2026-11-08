import type { Metadata,Viewport } from 'next';
import { siteConfig } from '@/config/site';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SessionProvider } from '@/components/SessionProvider';
import '@/styles/globals.css';
import '@/styles/approved-design.css';
import {shareImage} from '@/lib/metadata';
import {StructuredData} from '@/components/StructuredData';
export const metadata:Metadata={
  title:{default:`${siteConfig.name} — 무료 사주와 오늘의 운세`,template:`%s | ${siteConfig.name}`},
  description:siteConfig.description,
  ...(siteConfig.url?{metadataBase:new URL(siteConfig.url)}:{}),
  openGraph:{title:`${siteConfig.name} — 나를 알아가는 작은 시간`,description:siteConfig.description,locale:'ko_KR',type:'website',siteName:siteConfig.name,images:[shareImage]},
  twitter:{card:'summary_large_image',title:`${siteConfig.name} — 무료 사주와 오늘의 운세`,description:siteConfig.description,images:[shareImage.url]},
  robots:{index:true,follow:true},icons:{icon:'/favicon.svg'},
};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#faf9f6'};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="ko"><head><meta httpEquiv="Content-Security-Policy" content="form-action 'none'; base-uri 'self'; object-src 'none'"/></head><body><StructuredData data={{'@context':'https://schema.org','@type':'WebSite',name:siteConfig.name,url:siteConfig.url+'/',inLanguage:'ko-KR'}}/><SessionProvider><Header/>{children}<Footer/></SessionProvider></body></html>;
}
