import {AiSaju} from '@/components/ai/AiSaju';
import {pageMetadata} from '@/lib/metadata';
export const metadata=pageMetadata('AI 사주','회원 전용 AI 사주는 준비 중이에요. 개방 후 첫 진단 1회와 후속 질문 2회를 제공할 예정이에요.','/ai-saju/',false);
export default function Page(){return <AiSaju/>;}
