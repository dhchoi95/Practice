import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe,it,expect } from 'vitest';
import SectorExperience from '../../src/components/SectorExperience';
import { SessionProvider } from '../../src/components/SessionProvider';
import Home from '../../src/app/page';

const input={year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar' as const,leap:false,nickname:''};
function render(category:string){return renderToStaticMarkup(createElement(SessionProvider,null,createElement(SectorExperience,{input,category,today:'2026-10-23'})));}
describe('실제 렌더링 결과의 카테고리 분리',()=>{
  it.each(['day','tomorrow','month','year'])('%s contains six readings without a custom date or schedule form',category=>{
    const html=render(category);
    expect(html).not.toContain('type="date"');
    expect(html).not.toContain('schedule-notes');
    expect(html).not.toContain('href="/result/date/"');
    expect((html.match(/class="reading-section sector-body"/g)||[])).toHaveLength(6);
    expect(html).toContain('natal-table');
    expect(html).not.toContain('판단·지수·원고 연결 기록');
  });
  it('custom date waits for a date instead of displaying today by default',()=>{
    const html=render('date');
    expect(html).toContain('type="date"');
    expect(html).toContain('위에서 날짜를 고르면');
    expect(html).not.toContain('class="reading-section sector-body"');
    expect(html).toContain('natal-table');
  });
  it('home keeps the existing card grid without the added classification blocks',()=>{
    const html=renderToStaticMarkup(createElement(Home));
    expect(html).toContain('category-grid');
    expect(html).toContain('year-banner');
    expect(html).toContain('today-panel');
    expect(html).not.toContain('home-core-menus');
    expect(html).not.toContain('내 원국과 전통 해석 후보');
  });
});
