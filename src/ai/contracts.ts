import {z} from 'zod';
export const AI_LIMITS=Object.freeze({daily:3,initial:1,followups:2,questionCharacters:1000,contextMessages:4,contextCharacters:6000,inputTokens:4096,outputTokens:1536,attemptsPerTenMinutes:6,requestSeconds:25,sessionHours:12});
export const SOCIAL_PROVIDERS=['kakao','google','naver'] as const;
export type SocialProvider=typeof SOCIAL_PROVIDERS[number];
export const providerLabels:Record<SocialProvider,string>={kakao:'카카오',google:'구글',naver:'네이버'};
export const aiBirthSchema=z.object({year:z.number().int(),month:z.number().int(),day:z.number().int(),calendar:z.enum(['solar','lunar']),leap:z.boolean(),unknownTime:z.boolean(),hour:z.number().int().optional(),minute:z.number().int().optional(),luckClass:z.enum(['male','female']).optional()}).strict();
export type AiBirth=z.infer<typeof aiBirthSchema>;
export const messageSchema=z.object({role:z.enum(['user','assistant']),text:z.string().min(1).max(2000)}).strict();
export const aiRequestSchema=z.object({stage:z.enum(['initial','followup']),birth:aiBirthSchema,question:z.string().max(AI_LIMITS.questionCharacters),selectedYear:z.number().int().min(1962).max(2050).nullable().optional(),history:z.array(messageSchema).max(AI_LIMITS.contextMessages),saveBirth:z.boolean(),saveConversation:z.boolean(),conversationId:z.string().uuid().optional()}).strict().superRefine((v,ctx)=>{if(v.history.length%2!==0||v.history.some((m,i)=>m.role!==(i%2===0?'user':'assistant')))ctx.addIssue({code:'custom',message:'대화 순서를 확인해 주세요.',path:['history']});if(v.stage==='followup'&&!v.question.trim())ctx.addIssue({code:'custom',message:'질문을 입력해 주세요.',path:['question']});if(v.history.reduce((n,m)=>n+m.text.length,0)>AI_LIMITS.contextCharacters)ctx.addIssue({code:'custom',message:'대화가 너무 길어요.',path:['history']});});
export type AiRequest=z.infer<typeof aiRequestSchema>;
export const answerSchema=z.object({answer:z.string().min(20).max(900),interpretations:z.array(z.object({factId:z.string().max(60),quote:z.string().max(300),text:z.string().min(10).max(350)}).strict()).min(1).max(3),practicalChecks:z.array(z.string().min(5).max(200)).min(1).max(3),followUpQuestion:z.string().max(180).nullable()}).strict();
export type AiAnswer=z.infer<typeof answerSchema>;
export interface Fact {id:string;value:string;kind:'natal'|'period'|'limit';}
export interface Usage {day:string;used:number;remaining:number;initialDone:boolean;followupsRemaining:number;pending:boolean;resetAt:string;}
export interface SessionView {serverRelease?:{version:string|null;artifact:string|null};signedIn:boolean;pendingSignup:boolean;csrf:string|null;provider:SocialProvider|null;usage:Usage|null;aiConsent:boolean;aiEnabled:boolean;storageEnabled:boolean;retentionDays:number;termsAccepted:boolean;serverAvailable:boolean;launch:{ready:boolean;demo:boolean;message:string};providers:{id:SocialProvider;enabled:boolean}[];policy:{termsVersion:string;aiVersion:string;contact:string|null;recipient:string|null;countries:string|null;retention:string|null;storageLocation:string|null;};}
export interface AiResult {kind:'answer';requestId:string;period:string;answer:AiAnswer;facts:Fact[];demo:boolean;usage:Usage;conversationId?:string;storageWarning?:boolean;}
export const questionExamples=['내년에 이사해도 될까요?','내년에 취업할 수 있을까요?','올해 이직을 준비해도 될까요?'];
