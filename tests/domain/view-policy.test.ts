import { describe,it,expect } from 'vitest';
import { fortuneView } from '../../src/domain/fortune/view-policy';

describe('운세 메뉴별 날짜 경계',()=>{
  it('오늘은 다른 날짜를 전달해도 오늘만 보여준다',()=>{
    expect(fortuneView('day','2026-10-23','2030-01-01')).toEqual({kind:'day',customDate:false,showSchedule:false,target:'2026-10-23'});
  });
  it('내일은 연말에도 정확히 다음 날이며 지정일을 섞지 않는다',()=>{
    expect(fortuneView('tomorrow','2026-12-31','2030-01-01')).toEqual({kind:'day',customDate:false,showSchedule:false,target:'2027-01-01'});
  });
  it.each(['month','year'])('%s 메뉴는 현재 기간에 고정한다',category=>{
    const result=fortuneView(category,'2026-10-23','2030-01-01');
    expect(result.target).toBe('2026-10-23');
    expect(result.kind).toBe(category);
    expect(result.showSchedule).toBe(false);
  });
  it('지정일만 선택 날짜와 일정 참고를 제공한다',()=>{
    expect(fortuneView('date','2026-10-23','2026-11-08')).toEqual({kind:'day',customDate:true,showSchedule:true,target:'2026-11-08'});
  });
  it('지정일을 선택하기 전에는 오늘 결과를 대신 내놓지 않는다',()=>{
    expect(fortuneView('date','2026-10-23',null).target).toBeNull();
  });
});
