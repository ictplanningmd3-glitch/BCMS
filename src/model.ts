import Dexie from 'dexie';
import {z} from 'zod';
import atlas from '../public/atlas.json';
export const STAGES=['هیچ اقدامی نشده','برنامه ریزی شده','در حال اجرا','اجرایی شده','اثربخشی تایید شده'] as const;
export const KINDS=['اقدام بهبود','BIA','بازنگری','مانور','تست','آزمون'] as const;
export const CATEGORIES=['مالی','عملیاتی','اعتبار و مشتری','حقوقی'] as const;
export const fmt=(n:number)=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:1}).format(n);
const iso=z.string().refine(v=>v===''||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v),'تاریخ معتبر نیست');
const num=z.number().finite().nonnegative();
export const impactSchema=z.object({hours:num,severity:z.tuple([num.max(5),num.max(5),num.max(5),num.max(5)])});
export const biaSchema=z.object({scope:z.string(),dependencies:z.string(),resources:z.string(),weights:z.tuple([num,num,num,num]).refine(w=>w.some(x=>x>0),'حداقل یک وزن باید مثبت باشد'),entries:z.array(impactSchema).min(1).max(30).refine(es=>new Set(es.map(e=>e.hours)).size===es.length,'بازه‌های زمانی نباید تکراری باشند'),threshold:num.max(5).positive(),rto:num.nullable(),rpo:num.nullable(),mtpd:num.nullable(),mbco:num.max(100).nullable(),approval:z.string(),justification:z.string()}).refine(b=>b.rto===null||b.mtpd===null||b.rto<b.mtpd,'RTO باید کمتر از MTPD باشد');
export const taskSchema=z.object({id:z.string().min(1),domainId:z.string(),patternId:z.string(),title:z.string().trim().min(1),owner:z.string(),stage:z.enum(STAGES),kind:z.enum(KINDS),notes:z.string(),intervalDays:num.int().max(36500),lastDate:iso,bia:biaSchema});
const profileSchema=z.object({owner:z.string(),needs:z.string(),intervalDays:num.int().max(36500),lastDate:iso,reviewKind:z.enum(KINDS)});
const customSchema=z.object({id:z.string().min(1),domainId:z.string(),titleFa:z.string().trim().min(1),title:z.string(),definition:z.string(),simpleDefinition:z.string(),needs:z.string(),relatedPatterns:z.array(z.string()),custom:z.literal(true)});
export const storeSchema=z.object({schemaVersion:z.literal('2.0.0'),organization:z.string(),activeDomains:z.array(z.string()).max(12),activePatterns:z.array(z.string()).max(2000),customPatterns:z.array(customSchema).max(1000),profiles:z.record(profileSchema),tasks:z.array(taskSchema).max(20000)}).superRefine((s,ctx)=>{
 const ds=new Set(atlas.domains.map(d=>d.id)),ps=new Map([...atlas.patterns,...s.customPatterns].map(p=>[p.id,p.domainId]));
 const unique=(a:string[])=>new Set(a).size===a.length;
 if(!unique(s.tasks.map(t=>t.id))||!unique([...atlas.patterns.map(p=>p.id),...s.customPatterns.map(p=>p.id)])||!unique(s.activeDomains)||!unique(s.activePatterns))ctx.addIssue({code:z.ZodIssueCode.custom,message:'شناسه تکراری است'});
 if(s.activeDomains.some(d=>!ds.has(d))||s.activePatterns.some(p=>!ps.has(p))||s.customPatterns.some(p=>!ds.has(p.domainId))||s.tasks.some(t=>!ds.has(t.domainId)||ps.get(t.patternId)!==t.domainId)||Object.keys(s.profiles).some(p=>!ps.has(p)))ctx.addIssue({code:z.ZodIssueCode.custom,message:'ارتباط دامنه و پترن معتبر نیست'});
});
export type Store=z.infer<typeof storeSchema>;
export type Task=z.infer<typeof taskSchema>;
export type Bia=z.infer<typeof biaSchema>;
export type Profile=z.infer<typeof profileSchema>;
export type Pattern={id:string;domainId:string;titleFa:string;title:string;definition:string;simpleDefinition:string;needs:string;relatedPatterns:string[];custom?:boolean};
export const domains=atlas.domains;
export const patterns:Pattern[]=atlas.patterns.map(p=>({...p,needs:(p as {needs?:string}).needs||''}));
export const blankStore=():Store=>({schemaVersion:'2.0.0',organization:'',activeDomains:[],activePatterns:[],customPatterns:[],profiles:{},tasks:[]});
export const blankBia=():Bia=>({scope:'',dependencies:'',resources:'',weights:[1,1,1,1],entries:[1,4,8,24,48,72].map(hours=>({hours,severity:[0,0,0,0]})),threshold:4,rto:null,rpo:null,mtpd:null,mbco:null,approval:'',justification:''});
export const blankProfile=():Profile=>({owner:'',needs:'',intervalDays:0,lastDate:'',reviewKind:'بازنگری'});
export const newTask=(domainId:string,patternId:string,kind:Task['kind']='اقدام بهبود'):Task=>({id:crypto.randomUUID(),domainId,patternId,title:'',owner:'',stage:STAGES[0],kind,notes:'',intervalDays:0,lastDate:'',bia:blankBia()});
const db=new Dexie('dbr-continuity');db.version(1).stores({state:'id'});
export async function readStore():Promise<Store>{
 const record=await db.table('state').get('main');
 if(!record)return blankStore();
 if(record.value?.schemaVersion==='1.0.0'){
  // The user requested a completely clean organization; preserve a recovery copy
  // outside the active dataset before clearing the previous version.
  const clean=blankStore();await db.transaction('rw',db.table('state'),async()=>{await db.table('state').put({id:'before-v2-clean-start',value:record.value});await db.table('state').put({id:'main',value:clean})});return clean;
 }
 return storeSchema.parse(record.value);
}
export async function saveStore(value:Store){storeSchema.parse(value);await db.table('state').put({id:'main',value})}
export const allPatterns=(s:Store):Pattern[]=>[...patterns,...s.customPatterns];
export const isPatternActive=(s:Store,p:Pick<Pattern,'id'|'domainId'>)=>s.activeDomains.includes(p.domainId)&&s.activePatterns.includes(p.id);
export const eligiblePatterns=(s:Store)=>allPatterns(s).filter(p=>isPatternActive(s,p));
export const activeTasks=(s:Store)=>s.tasks.filter(t=>isPatternActive(s,{id:t.patternId,domainId:t.domainId}));
export const stagePercent=(s:Task['stage'])=>STAGES.indexOf(s)*25;
export const patternProgress=(s:Store,id:string)=>{const ts=activeTasks(s).filter(t=>t.patternId===id);return ts.length?ts.reduce((sum,t)=>sum+stagePercent(t.stage),0)/ts.length:0};
export const domainProgress=(s:Store,id:string)=>{const ps=eligiblePatterns(s).filter(p=>p.domainId===id);return ps.length?ps.reduce((sum,p)=>sum+patternProgress(s,p.id),0)/ps.length:0};
export const overallProgress=(s:Store)=>s.activeDomains.length?s.activeDomains.reduce((sum,id)=>sum+domainProgress(s,id),0)/s.activeDomains.length:0;
export const level=(percent:number)=>percent<25?'red':percent<50?'orange':percent<75?'yellow':'green';
export function weightedImpact(severity:number[],weights:number[]){const total=weights.reduce((a,b)=>a+b,0);return total>0?severity.reduce((sum,v,i)=>sum+v*weights[i],0)/total:0}
export const impactResults=(b:Bia)=>[...b.entries].sort((a,c)=>a.hours-c.hours).map(e=>({hours:e.hours,score:weightedImpact(e.severity,b.weights)}));
export const thresholdTime=(b:Bia)=>impactResults(b).find(e=>e.score>=b.threshold)?.hours??null;
export const todayISO=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function due(lastDate:string,intervalDays:number,today=todayISO()){
 if(!lastDate||intervalDays<=0)return null;
 const when=new Date(lastDate+'T00:00:00Z');when.setUTCDate(when.getUTCDate()+intervalDays);
 return {date:when.toISOString().slice(0,10),remaining:Math.round((when.getTime()-Date.parse(today+'T00:00:00Z'))/86400000)};
}
export function persianDate(date:string){return date?new Intl.DateTimeFormat('fa-IR',{timeZone:'UTC',dateStyle:'medium'}).format(new Date(date+'T00:00:00Z')):'تعیین نشده'}
export const dueLabel=(days:number)=>days<0?`${fmt(-days)} روز از موعد گذشته`:days===0?'موعد انجام امروز':`${fmt(days)} روز مانده`;
export function agenda(s:Store){const ps=eligiblePatterns(s);return [...ps.flatMap(p=>{const cfg=s.profiles[p.id];const d=cfg&&due(cfg.lastDate,cfg.intervalDays);return d?[{id:'p-'+p.id,patternId:p.id,domainId:p.domainId,title:p.titleFa,kind:cfg.reviewKind,owner:cfg.owner,intervalDays:cfg.intervalDays,...d,taskId:null as string|null}]:[]}),...activeTasks(s).flatMap(t=>{const d=due(t.lastDate,t.intervalDays);return d?[{id:t.id,taskId:t.id,patternId:t.patternId,domainId:t.domainId,title:t.title,kind:t.kind,owner:t.owner,intervalDays:t.intervalDays,...d}]:[]})].sort((a,b)=>a.remaining-b.remaining)}
