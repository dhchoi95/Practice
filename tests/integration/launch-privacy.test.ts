import {expect,it} from 'vitest';
import {analyticsStatus,publicEvent,setAnalyticsConsent,trackPublicEvent} from '@/lib/analytics';
it('accepts only public event names and menu enums, never result/account/query routes or arbitrary fields',()=>{
 const event={name:'public_menu_click',menu:'day'};
 expect(publicEvent(event,'/fortune/day/')).toEqual(event);
 for(const path of ['/result/day/','/ai-saju/','/api/session','/auth/callback/kakao','/?birth=1990-01-01','/fortune/day/#private'])expect(publicEvent(event,path)).toBeNull();
 for(const body of [{...event,birth:'1990-01-01'},{name:'unknown',menu:'day'},{...event,menu:'1990-01-01'},{...event,text:'private'}])expect(publicEvent(body,'/')).toBeNull();
});
it('keeps tracking disabled for unset, declined, accepted and withdrawn consent without a provider',()=>{
 for(const choice of ['unset','denied','granted','denied'] as const){setAnalyticsConsent(choice);expect(analyticsStatus()).toEqual({enabled:false,provider:null,measurementId:null,consent:choice});expect(trackPublicEvent({name:'share_menu',menu:'day'},'/fortune/day/')).toBe(false);}
 setAnalyticsConsent('unset');
});
