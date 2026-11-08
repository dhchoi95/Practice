import type {Metadata} from 'next';
import {siteConfig} from '@/config/site';
export const shareImage={url:`${siteConfig.url}/og.png`,width:1200,height:630,type:'image/png',alt:`${siteConfig.name} — 무료 사주와 오늘의 운세`};
export function pageMetadata(title:string,description:string,path:string,index=true):Metadata{
 const url=siteConfig.url+path;
 return {title,description,...(index?{alternates:{canonical:url}}:{}),robots:{index,follow:index},openGraph:{title:`${title} | ${siteConfig.name}`,description,url,type:'website',locale:'ko_KR',siteName:siteConfig.name,images:[shareImage]},twitter:{card:'summary_large_image',title:`${title} | ${siteConfig.name}`,description,images:[shareImage.url]}};
}
