import {siteConfig} from '@/config/site';
export function StructuredData({data}:{data:Record<string,unknown>}){return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,'\\u003c')}}/>;}
export function BreadcrumbData({name,path}:{name:string;path:string}){return <StructuredData data={{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'홈',item:siteConfig.url+'/'},{'@type':'ListItem',position:2,name,item:siteConfig.url+path}]}}/>;}
