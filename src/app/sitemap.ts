import type { MetadataRoute } from 'next';
import { categories,siteConfig } from '@/config/site';
export const dynamic='force-static';
export default function sitemap():MetadataRoute.Sitemap {
  if(!siteConfig.url)return [];
  return ['/',...categories.map(c=>`/fortune/${c.slug}/`),...['guide','glossary','privacy','terms','credits'].map(s=>`/${s}/`)].map(path=>({url:`${siteConfig.url}${path}`}));
}
