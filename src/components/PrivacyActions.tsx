'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useSession} from './SessionProvider';
export function PrivacyActions(){const {clear}=useSession(),[message,setMessage]=useState('');return <section id="delete-inputs"><h2>입력한 정보 지우기</h2><p>기본 운세의 출생정보, 짝궁합 두 사람의 입력과 직접 고른 유형을 이 브라우저의 메모리에서 지웁니다.</p><button className="button" onClick={()=>{clear();setMessage('이 브라우저에서 입력한 출생정보와 선택을 지웠어요.');}}>이 브라우저의 입력 지우기</button><p role="status">{message}</p><p>회원이 서버에 저장한 출생정보·대화는 <Link className="inline-link" href="/ai-saju/">AI 사주의 계정 관리</Link>에서 개별·전체 삭제할 수 있어요. 회원 탈퇴는 계정과 세션을 함께 삭제합니다. 현재 회원가입과 AI 이용은 준비 중이에요.</p><p className="helper">직접 내려받은 텍스트·PDF와 브라우저의 문서 복원 기록은 해당 기기에서 따로 관리해 주세요.</p></section>;}
