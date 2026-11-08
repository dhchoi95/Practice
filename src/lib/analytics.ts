/** Inactive preparation only. There is no provider, measurement ID, SDK, queue or transport.
 * Future collection requires an explicit provider/policy implementation and fresh network tests.
 */
import {z} from 'zod';
import {navigationCategories} from '@/config/site';
const menus=['home','guide',...navigationCategories.map(c=>c.slug)] as const;
const eventSchema=z.object({name:z.enum(['public_menu_click','share_menu']),menu:z.enum(menus)}).strict();
export type AnalyticsConsent='unset'|'granted'|'denied';
let consent:AnalyticsConsent='unset';
export function setAnalyticsConsent(value:AnalyticsConsent){consent=value;}
export function analyticsStatus(){return {enabled:false,provider:null,measurementId:null,consent} as const;}
export function publicEvent(input:unknown,pathname:string){
 if(pathname!=='/'&&pathname!=='/guide/'&&!navigationCategories.some(c=>pathname===`/fortune/${c.slug}/`))return null;
 const event=eventSchema.safeParse(input);return event.success?event.data:null;
}
export function trackPublicEvent(input:unknown,pathname:string):boolean{
 if(!publicEvent(input,pathname)||consent!=='granted')return false;
 // Even consent never enables an unconfigured service. No cookie-less pings or automatic page views.
 return false;
}
