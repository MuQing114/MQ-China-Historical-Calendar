/* 生日四柱与纳音 2.1.0. GPL-3.0. 2026-11-09.
 * NaYin: 《卜筮全书·六十甲子歌》, public-domain original.
 * Calendar boundary rules are explicit; pattern labels are a declared
 * month-main-qi simplification, never inferred from NaYin or a fortune score.
 */
(function(host){'use strict';
const C=host.HistoryCalendar,EL=['木','火','土','金','水'];
const NAMES=['海中金','炉中火','大林木','路傍土','剑锋金','山头火','涧下水','城头土','白蜡金','杨柳木','井泉水','屋上土','霹雳火','松柏木','长流水','砂中金','山下火','平地木','壁上土','金箔金','覆灯火','天河水','大驿土','钗钏金','桑柘木','大溪水','沙中土','天上火','石榴木','大海水'];
const HIDDEN=['癸','己癸辛','甲丙戊','乙','戊乙癸','丙戊庚','丁己','己丁乙','庚壬戊','辛','戊辛丁','壬甲'];
const BRANCH_EL=[4,2,0,0,2,1,1,2,3,3,2,4],LU=[2,3,5,6,5,6,8,9,11,0],BLADE={0:3,2:6,4:6,6:9,8:0};
const RULES={nayin:'https://www.shidianguji.com/zh/book/HY1394/chapter/1l3wdooouerec',stems:'https://www.shidianguji.com/zh/mid-page/7459881163236376613',pattern:'https://www.mingsage.com/zh/classics/zi-ping-zhen-quan/lun-yong-shen'};
const BOUNDARY={zi:'子初换日：日柱和时干均在23:00换日',midnight:'子正换日：日柱和时干均在00:00换日',split:'早晚子口径：日柱00:00换日，时干23:00换日'};
function naYin(gz){const i=C.CYCLE.indexOf(gz);if(i<0)return null;const n=NAMES[Math.floor(i/2)];return {name:n,element:n.at(-1),pair:C.CYCLE[i-i%2]+'、'+C.CYCLE[i-i%2+1]};}
function stemInfo(g){const i=C.GAN.indexOf(g);return i<0?null:{stem:g,index:i,element:EL[Math.floor(i/2)],yinYang:i%2?'阴':'阳'};}
function tenGod(day,g){const a=stemInfo(day),b=stemInfo(g);if(!a||!b)return null;const rel=C.mod(Math.floor(b.index/2)-Math.floor(a.index/2),5),same=a.index%2===b.index%2;return [['比肩','劫财'],['食神','伤官'],['偏财','正财'],['七杀','正官'],['偏印','正印']][rel][same?0:1];}
function pillar(gz,role,day){
 if(!gz)return {role,gz:null,nayin:null,stem:null,branch:null,hidden:[],god:null};
 const g=stemInfo(gz[0]),b=C.ZHI.indexOf(gz[1]);
 return {role,gz,nayin:naYin(gz),stem:g,branch:{name:gz[1],index:b,element:EL[BRANCH_EL[b]],yinYang:b%2?'阴':'阳'},hidden:[...HIDDEN[b]].map(s=>({...stemInfo(s),god:tenGod(day,s)})),god:role==='日柱'?'日主':tenGod(day,gz[0])};
}
function pattern(pillars){
 const day=pillars[2].stem,month=pillars[1].branch;if(!day||!month)return {title:'资料不足，不能取格',basis:'没有可用的节气月柱，不把农历月或纳音代作月令。',candidates:[],notes:[]};
 const hidden=pillars[1].hidden,main=hidden[0],god=main.god,visible=pillars.filter((_,i)=>i!==2).filter(p=>p.stem);
 const exposed=hidden.map(h=>({stem:h.stem,god:h.god,where:visible.filter(p=>p.stem.stem===h.stem).map(p=>p.role)})).filter(h=>h.where.length);
 let title=god==='比肩'?'比肩当令（取格待核）':god==='劫财'?'月劫格':god+'格';
 if(month.index===LU[day.index])title='建禄格';else if(BLADE[day.index]===month.index)title='阳刃格';
 const notes=['这里按月令本气列出格局参考，不等于已经成格。'];
 if([1,4,7,10].includes(month.index))notes.push('辰戌丑未属杂气月，应进一步核对藏干透出及组合，本气标签不能直接定格。');
 if(!pillars[3].gz)notes.push('时柱未定，透干线索和格局资料不完整。');
 return {title,basis:`${month.name}月本气为${main.stem}${main.element}，相对日主${day.stem}${day.element}为${god}。`+(title==='建禄格'?`${day.stem}禄在${month.name}，故列建禄参考。`:title==='阳刃格'?`按阳干帝旺位列阳刃参考。`:''),candidates:exposed,notes};
}
function counts(pillars){
 const surface=Object.fromEntries(EL.map(e=>[e,0])),h=new Set();let total=0;
 for(const p of pillars)if(p.gz){surface[p.stem.element]++;surface[p.branch.element]++;total+=2;p.hidden.forEach(s=>h.add(s.element));}
 return {surface,total,hidden:EL.filter(e=>h.has(e)),unseen:EL.filter(e=>!surface[e])};
}
function make(cal){
 const prepared={};
 for(const mode of ['modern','official']){
  const ts=cal.terms[mode].filter(t=>t[1]%2===0).map(t=>({at:Math.round(t[0]*1440),term:t[1],sourceYear:t[2],fallback:!!t[3]}));
  prepared[mode]=ts.slice(0,-1).map((t,i)=>{const y=t.term===0?t.sourceYear-1:t.sourceYear,m=C.mod(t.term/2+11,12)+1,gs=C.GAN[C.mod(2*C.mod(y-4,10)+m+1,10)],zs=C.ZHI[C.mod(m+1,12)];return {...t,end:ts[i+1].at,year:y,yearGZ:C.yearGZ(y),monthGZ:gs+zs};});
 }
 function frameAt(at,mode){const a=prepared[mode];let lo=0,hi=a.length-1;while(lo<=hi){const i=(lo+hi)>>1,f=a[i];if(at<f.at)hi=i-1;else if(at>=f.end)lo=i+1;else return f;}return null;}
 function inDomain(j){if(!Number.isInteger(j)||j<cal.domainStart||j>=cal.domainEnd)throw Error('出生日期超出本版范围：前2070年至2026-11-09。');return j;}
 function resolve(input={}){
  const kind=input.calendar||'gregorian';
  if(kind==='gregorian'||kind==='julian'){
   const a=String(input.date||'').trim().match(/^(前\d+|\d{1,4})[-/.](\d{1,2})[-/.](\d{1,2})$/);if(!a)throw Error('生日请按1986-05-29或前722-02-01填写。');
   return [{j:inDomain(C.toJdn(cal.civilYear(a[1]),+a[2],+a[3],kind)),source:kind==='julian'?'输入儒略历日期':'输入公历日期',warnings:[]}];
  }
  if(kind!=='lunar')throw Error('未知生日历法。');
  const y=cal.parseYear(input.year);if(!['number','era'].includes(y.type)||y.type==='era'&&y.value===null)throw Error('农历生日请填具体年份或完整年号年，如1380、洪武十三；不能只给一个干支年或年号。');
  if(!input.month||!input.day)throw Error('请填完整的农历月和日；闰月请写“闰二”，普通月选“只查普通月”。');
  const p=cal.parseDay(input.day);if(p.type==='all')throw Error('出生日期不能留空。');
  const r=cal.query({year:input.year,month:input.month,day:input.day,leap:input.leap||'regular',polity:input.polity||'',mode:'lunar',boundary:'midnight'});
  const byJ=new Map();let nonLunar=false;
  for(const row of r.rows){
   if(row.kind!=='day')continue;
   const rec=row.frame?.record;if(rec&&rec.system!=='当地史历'){nonLunar=true;continue;}
   const j=row.j;if(j<cal.domainStart||j>=cal.domainEnd)continue;
   const warnings=[];if(rec?.doubt||rec?.precision!=='日'&&rec)warnings.push('所选政权当地历表存在存疑或精度限制；此次日期仅作来源候选。');
   const source=rec?`${rec.polity}·${rec.era}${row.frame.regnal}年 ${row.frame.label}月 ${input.day}日`:`基准史历 ${input.year}年 ${input.month}月 ${input.day}日`;
   if(byJ.has(j)){const old=byJ.get(j);old.source+='；'+source;old.warnings.push(...warnings);}else byJ.set(j,{j,source,warnings});
  }
  if(!byJ.size){if(nonLunar)throw Error('该纪年使用公历或其他历制，不能冒充农历生日；请改用公历输入。');throw Error(r.rows.some(x=>x.kind==='coarse')?'该生日只有年度资料，不能据此生成确定的出生月日或完整八字。':'没有对应的农历生日，请核对大小月、闰月、年号和日期上限。');}
  return [...byJ.values()].sort((a,b)=>a.j-b.j);
 }
 function timeWindows(input){
  const mode=input.timeMode||'exact';
  if(mode==='unknown'||mode==='exact'&&!String(input.time||'').trim())return {known:false,exact:false,windows:[[0,1440]],label:'出生时辰不详'};
  if(mode==='exact'){
   const a=String(input.time).match(/^(\d{2}):(\d{2})$/);if(!a||+a[1]>23||+a[2]>59)throw Error('时分须在00:00—23:59之间。');const m=+a[1]*60 + +a[2];return {known:true,exact:true,minute:m,windows:[[m,m+1]],label:String(input.time)};
  }
  if(mode!=='branch')throw Error('未知出生时间精度。');
  const h=cal.parseHour(input.branch);if(!h)throw Error('请选择出生时辰。');
  if(h.gz)throw Error('这里只需选择子、丑等时辰，时干由日柱规则计算。');
  const b=h.b;let windows=b===0?[[0,60],[1380,1440]]:[[b*120-60,b*120+60]];
  if(h.phase!=='all')windows=b===0?(h.phase==='初'?[[1380,1440]]:[[0,60]]):h.phase==='初'?[[b*120-60,b*120]]:[[b*120,b*120+60]];
  return {known:true,exact:false,windows,label:C.ZHI[b]+'时'+(h.phase==='all'?'':h.phase)+'（钟面区间）'};
 }
 function build(input={}){
  const j=inDomain(input.j),offset=input.offset===undefined?8:Number(input.offset),mode=input.termMode||'modern',boundary=input.boundary||'zi';
  if(!Number.isFinite(offset)||offset< -12||offset>14||!Number.isInteger(offset*4))throw Error('UTC时差应在−12至+14之间，按15分钟填写，如8、5.5或5.75。');
  if(!prepared[mode])throw Error('未知节气口径。');if(!BOUNDARY[boundary])throw Error('未知换日规则。');
  const tm=timeWindows(input),shift=(8-offset)*60,groups=new Map(),base=j*1440;
  for(const [s,e] of tm.windows){
   const cuts=[s,e];if(s<1380&&e>1380&&boundary==='zi')cuts.push(1380);
   for(const f of prepared[mode]){const local=f.at-shift-base;if(local>s&&local<e)cuts.push(local);}
   cuts.sort((a,b)=>a-b);const points=[...new Set(cuts)];
   for(let i=0;i<points.length-1;i++){
    const a=points[i],z=points[i+1];if(z<=a)continue;const minute=a,f=frameAt(base+minute+shift,mode);
    const d=j+(minute>=1380&&boundary==='zi'?1:0),hd=j+(minute>=1380&&(boundary==='zi'||boundary==='split')?1:0),b=Math.floor((minute+60)/120)%12;
    const raw=[f?.yearGZ||null,f?.monthGZ||null,C.dayGZ(d),tm.known?C.hourGZ(hd,b):null],key=raw.join('|');
    if(groups.has(key))groups.get(key).windows.push([a,z]);else groups.set(key,{raw,frame:f,windows:[[a,z]],effectiveDay:d,hourDay:hd});
   }
  }
  const lunar=cal.mainAt(j),lunarYear=lunar?{gz:lunar.yearGZ,nayin:naYin(lunar.yearGZ),year:lunar.y}:null;
  const charts=[...groups.values()].map((x,i)=>{
   const ps=x.raw.map((gz,n)=>pillar(gz,['年柱','月柱','日柱','时柱'][n],x.raw[2][0]));
   return {...x,id:i,pillars:ps,dayMaster:ps[2].stem,pattern:pattern(ps),elements:counts(ps),yearLife:ps[0].nayin,eightChars:x.raw.map(g=>g||'未定').join(' '),complete:x.raw.every(Boolean)};
  });
  const notes=[...(input.warnings||[])];
  if(!tm.known)notes.push('未提供出生时刻：时柱留空；若当日交节或换日，分别列出候选，不默认当作子时或午时。');
  if(charts.length>1)notes.push('所给时间范围横跨交节或换日边界，存在多种候选排盘；缺少更细时间时不能确定唯一结果。');
  if(charts.some(c=>!c.frame))notes.push('该时期没有可用节气表，年柱、月柱无法确定；日时干支只作数学回推，不组成确定的完整八字。');
  if(C.fromJdn(j).y<1900)notes.push('这是按所选规则对历史生日回排，不代表当时命书已经采用同一排法；历史钟面未经地方真太阳时校正。');
  if(mode==='official')notes.push('历书口径仅精确到交节日期，以UTC+8交节日00:00为边界；不是古代实测的交节分钟。');
  if(charts.some(c=>c.frame?.fallback))notes.push('此期历书节气缺独立资料，交节日采用现代定气日期参照。');
  if(charts.some(c=>lunarYear&&c.pillars[0].gz&&c.pillars[0].gz!==lunarYear.gz))notes.push('农历岁首年与立春年柱不同；四柱年命和农历岁首口径的年命分开显示。');
  return {j,date:C.dateText(j),julian:C.dateText(j,'julian'),lunar,lunarYear,time:tm,offset,termMode:mode,boundary,boundaryLabel:BOUNDARY[boundary],source:input.source||'生日排盘',charts,notes:[...new Set(notes)]};
 }
 return {resolve,build,frameAt,prepared};
}
host.BirthCalendar={make,naYin,stemInfo,tenGod,pillar,pattern,counts,NAMES,HIDDEN,EL,RULES,BOUNDARY};
})(typeof window==='undefined'?globalThis:window);
