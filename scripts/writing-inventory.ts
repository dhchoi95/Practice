import fs from 'node:fs/promises';
import {natalModules} from '../src/content/advanced/natal';
import {periodModules} from '../src/content/advanced/period';
import {mbtiContent,mbtiBasicContent} from '../src/content/advanced/mbti';
import {sectorRecords,scheduleRecords} from '../src/domain/foundation/engine';
const legacy=JSON.parse(await fs.readFile('src/content/rules.json','utf8'));
const inventory={
 fortune:{files:['src/content/foundation/sectors.json'],records:sectorRecords.length,semanticIds:new Set(sectorRecords.map(r=>r.semanticId)).size,rewrittenDay:180,rewrittenMonth:6,rewrittenYear:6,pendingMonthYear:348},
 schedule:{file:'src/content/foundation/schedules.json',records:scheduleRecords.length,rewritten:0,scope:'지정일의 일정 준비 안내; 이번 운세 본문 집필과 별도'},
 traditional:{file:'src/content/advanced/natal.ts',records:natalModules.length,rewritten:0,status:'정통사주 분석 근거·용어 해설 전체 교정은 후속 검토'},
 advancedPeriods:{file:'src/content/advanced/period.ts',records:periodModules.length,rewritten:0},
 legacyTopics:{file:'src/content/rules.json',records:Array.isArray(legacy)?legacy.length:legacy.rules?.length,rewritten:0},
 mbti:{file:'src/content/advanced/mbti.ts',topicRecords:mbtiContent.length,basicRecords:mbtiBasicContent.length,rewritten:0},
 manse:{files:['src/components/NatalChart.tsx','src/components/AdvancedExperience.tsx'],scope:'사주표·지장간·십신과 계산 기준 해설. 사실·미구현 범위 보존, 문구 전체 교정은 미실행'},
 selection:['src/domain/foundation/engine.ts','src/domain/advanced/modules.ts','src/domain/interpretation/engine.ts'],
 assembly:['src/domain/foundation/presentation.ts','src/components/SectorExperience.tsx','src/components/AdvancedExperience.tsx','src/components/FortuneResult.tsx'],
 guidance:['src/components/BirthForm.tsx','src/components/ShareActions.tsx','src/content/foundation/period-notes.json'],
 observedIssue:'가장 오래 적용되는 중심 원고와 같은 구간의 보완 최대2개를 연결. 정확히 같은 문단만 자동 제거하므로 의미가 비슷한 핵심·보완은 조립 뒤 별도 편집 필요. 월·연 일부만 새 문체여서 기존 보완과 말투가 섞이는 범위는 완료로 처리하지 않음.',
};await fs.writeFile('reports/writing-reset/source-inventory.json',JSON.stringify(inventory,null,2)+'\n');console.log('Source inventory written; unchanged corpora explicitly scoped.');
