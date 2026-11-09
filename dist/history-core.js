/* 中国历史历日检索 2.0 — GPL-3.0. Data licences are listed in the offline page.
 * 2026-11-09: BCE-safe civil dates, historical lunar calendars, concurrent eras.
 */
(function(host){'use strict';
const GAN='甲乙丙丁戊己庚辛壬癸',ZHI='子丑寅卯辰巳午未申酉戌亥';
const CYCLE=Array.from({length:60},(_,i)=>GAN[i%10]+ZHI[i%12]);
const MONTHS=['正','二','三','四','五','六','七','八','九','十','十一','十二'];
const DAYS=['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十','三十一'];
const TERMS=['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];
const mod=(a,b)=>(a%b+b)%b,pad=n=>String(n).padStart(2,'0');
function fromJdn(j,kind='gregorian'){
 j=Math.floor(j);let b,c;if(kind==='julian'){b=0;c=j+32082;}else{const a=j+32044;b=Math.floor((4*a+3)/146097);c=a-Math.floor(146097*b/4);}
 const u=Math.floor((4*c+3)/1461),e=c-Math.floor(1461*u/4),n=Math.floor((5*e+2)/153);
 return {y:100*b+u-4800+Math.floor(n/10),m:n+3-12*Math.floor(n/10),d:e-Math.floor((153*n+2)/5)+1};
}
function toJdn(y,m,d,kind='gregorian'){
 if(!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)||m<1||m>12||d<1||d>31)throw Error('请填写有效的年月日。');
 const a=Math.floor((14-m)/12),yy=y+4800-a,mm=m+12*a-3;
 let j=d+Math.floor((153*mm+2)/5)+365*yy+Math.floor(yy/4)+(kind==='julian'?-32083:-Math.floor(yy/100)+Math.floor(yy/400)-32045);
 const r=fromJdn(j,kind);if(r.y!==y||r.m!==m||r.d!==d)throw Error('该日不存在，请检查月份天数和闰年。');return j;
}
const yearText=y=>y<=0?'前'+(1-y):String(y);
const dateText=(j,kind='gregorian')=>{const p=fromJdn(j,kind);return `${yearText(p.y)}-${pad(p.m)}-${pad(p.d)}`;};
const yearGZ=y=>CYCLE[mod(y-4,60)],dayIndex=j=>mod(Math.floor(j)+49,60),dayGZ=j=>CYCLE[dayIndex(j)];
const hourGZ=(j,b)=>GAN[(dayIndex(j)%10*2+b)%10]+ZHI[b];
function make(data,eraData,supplement){
 const domainStart=toJdn(data.minYear,1,1),domainEnd=data.lastDate?toJdn(...data.lastDate)+1:toJdn(data.maxYear+1,1,1);
 const simp=s=>Array.from(String(s??'')).map(c=>eraData.charMap[c]||c).join('');
 const norm=s=>simp(String(s??'')).trim().replace(/[\s，,。；;]/g,'').replace(/[０-９]/g,c=>String(c.charCodeAt(0)-65296));
 function number(s){
  s=norm(s).replace(/^初/,'').replace(/廿/g,'二十').replace(/卅/g,'三十');if(/^\d+$/.test(s))return Number(s);if(s==='元'||s==='正')return 1;if(s==='冬')return 11;if(s==='腊')return 12;
  const ds='零一二三四五六七八九';if(s.length===1&&ds.includes(s))return ds.indexOf(s);
  if(!/^[零一二三四五六七八九十百千]+$/.test(s))return NaN;
  let n=0,t=0;for(const c of s){if(ds.includes(c))t=ds.indexOf(c);else{n+=(t||1)*({十:10,百:100,千:1000}[c]);t=0;}}return n+t;
 }
 function civilYear(s){s=norm(s).replace(/年$/,'').replace(/^公元/,'');if(/^前\d{1,4}$/.test(s)){const y=+s.slice(1);if(!y)throw Error('不存在公元前0年。');return 1-y;}if(/^\d{1,4}$/.test(s)){if(+s===0)throw Error('历史纪年没有公元0年；公元前请写“前1”。');return +s;}throw Error('年份请写“前722”或“1385”；历史纪年没有0年。');}
 function gz(s,label){const n=CYCLE.indexOf(s);if(n<0)throw Error(`${label}“${s}”不是有效的六十干支组合，请核对己/已/巳、戊/戌。`);return n;}
 const byStart=(list,t,start=0,end=1)=>{let lo=0,hi=list.length-1;while(lo<=hi){const n=(lo+hi)>>1,r=list[n];if(t<r[start])hi=n-1;else if(t>=r[end])lo=n+1;else return r;}return null;};
 const mainMonths=data.mainMonths;
 const yearMap=new Map();for(const m of mainMonths){if(!yearMap.has(m[0]))yearMap.set(m[0],[]);yearMap.get(m[0]).push(m);}
 const monthGZ=(xia,jian)=>GAN[mod(2*mod(xia-4,10)+jian+1,10)]+ZHI[mod(jian+1,12)];
 function mainAt(j){const m=byStart(mainMonths,j,3,4);return m?{y:m[0],m:m[1],label:m[2],d:Math.floor(j)-m[3]+1+m[8],s:m[3],e:m[4],offset:m[8],yearGZ:yearGZ(m[0]),monthGZ:m[7].startsWith('春秋')?null:monthGZ(m[6],m[5]),source:m[7],raw:m}:null;}
 const canon=s=>norm(s).replace(/朝$/,'').replace(/^曹魏$/,'魏').replace(/^蜀汉$/,'蜀').replace(/^孙吴$/,'吴').replace(/^夏$/,'胡夏').replace(/^梁$/,'南梁').replace(/^齐$/,'南齐').replace(/^前赵$/,'汉赵').replace(/^后梁\(南朝\)$/,'后梁').replace(/^武周$/,'唐');
 const records=eraData.records.map(r=>({...r}));
 for(const r of records)if(r.s<toJdn(-139,1,1))r.kind=r.era==='共和'?'政治纪年':'君主纪年';
 const excludedSupplement=[];
 for(const raw of supplement){
  const r={...raw,polity:simp(raw.polity),era:simp(raw.era),monarch:simp(raw.monarch),note:simp(raw.note),source:'年度补充',months:[],aliases:[],kind:'年号',doubt:raw.uncertain,system:'未核当地历法'};
  r.sy=raw.sy;r.ey=raw.ey;r.s=r.sy===null?null:toJdn(r.sy,1,1);r.e=r.ey===null?null:toJdn(r.ey+1,1,1);
  const match=records.find(x=>norm(x.era)===norm(r.era)&&r.s!==null&&x.s!==null&&x.e>r.s&&r.e>x.s&&(canon(x.polity)===canon(r.polity)||x.aliases.some(a=>a.length>1&&r.monarch.includes(a))));
  if(match){match.supplementSource=r.url;excludedSupplement.push(r.id);continue;}
  // Explicitly reported fictitious/misattributed names remain searchable but are
  // never automatically attached to an actual date.
  r.rejected=/伪作|伪造|造假|假造|并无此|按.*无此年号|并未使用/.test(r.note);
  records.push(r);
 }
 // Modern numbering is a calendar system, never a leader's personal reign.
 for(const a of [{id:'modern-roc',polity:'民国纪年（1912年起；现行于台湾地区）',era:'民国',first:1912,base:1911,s:toJdn(1912,1,1),note:'民国纪年，月份和日期采用公历，不是帝王年号。'},
 {id:'modern-prc',polity:'中华人民共和国',era:'公元',first:1949,base:0,s:toJdn(1949,10,1),note:'1949年10月1日起，采用公元纪年，无帝王年号。'}]){
  const r={...a,e:domainEnd,monarch:'',kind:'纪年制度',precision:'日',source:'纪年制度说明',system:'公历',months:[],yearPoints:[],aliases:[]};
  for(let y=a.first;y<=data.maxYear;y++){
   r.yearPoints.push([Math.max(r.s,toJdn(y,1,1)),String(y-a.base)]);
   for(let m=1;m<=12;m++){const s=Math.max(r.s,toJdn(y,m,1)),e=Math.min(domainEnd,m===12?toJdn(y+1,1,1):toJdn(y,m+1,1));if(s<e)r.months.push([s,e,String(y-a.base),String(m),s-toJdn(y,m,1),mod(y-4,60),y,NaN]);}
  }
  records.push(r);
 }
 const recordMap=new Map(records.map(r=>[r.id,r]));
 const polities=[...new Set(records.map(r=>r.polity))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
 const terms={official:data.ping,modern:data.modern};
 const solarFrames={};
 for(const mode of Object.keys(terms)){const js=terms[mode].filter(t=>t[1]%2===0&&Number.isFinite(t[0]));solarFrames[mode]=js.slice(0,-1).map((t,i)=>{const y=t[1]===0?t[2]-1:t[2],m=mod(t[1]/2+11,12)+1;return {y,m,label:MONTHS[m-1],s:t[0],e:js[i+1][0],gz:monthGZ(y,m),yearGZ:yearGZ(y),source:mode,offset:0};});}
 function parseMonth(s,leap='all'){
  s=norm(s).replace(/月$/,'');if(!s)return {type:'all',leap};
  if(s==='后九')return {type:'special',value:'后九',leap:'all'};
  if(s==='一')return {type:'label',value:'一',leap};
  if(s.startsWith('闰')){leap='leap';s=s.slice(1);if(!s)return {type:'all',leap};}
  if(s.length===2&&GAN.includes(s[0]))return {type:'gz',value:CYCLE[gz(s,'月干支')],leap};
  const n=number(s);if(!Number.isInteger(n)||n<1||n>12)throw Error('月份可填甲寅、正月、闰七月、后九月或1—12。');return {type:'number',value:n,leap};
 }
 function parseDay(s){s=norm(s).replace(/日$/,'');if(!s)return {type:'all'};if(s.length===2&&GAN.includes(s[0]))return {type:'gz',value:CYCLE[gz(s,'日干支')]};const d=number(s);if(!Number.isInteger(d)||d<1||d>31)throw Error('日期可填甲子、初一、廿七或日数；普通农历最大三十。');return {type:'number',value:d};}
 function parseHour(s){s=norm(s).replace(/时/g,'');if(!s)return null;let phase='all';if(/[初正]$/.test(s)){phase=s.at(-1);s=s.slice(0,-1);}if(s.length===1&&ZHI.includes(s))return {b:ZHI.indexOf(s),gz:null,phase};const n=gz(s,'时干支');return {b:n%12,gz:CYCLE[n],phase};}
 function eraMatches(input,r){
  let s=norm(input).replace(/蜀汉/g,'蜀').replace(/曹魏/g,'魏').replace(/孙吴/g,'吴');
  const name=norm(r.era);if(!name||!s.endsWith(name))return false;
  const head=s.slice(0,-name.length);if(!head)return true;
  const pool=norm(r.polity+r.monarch+r.aliases.join('')).replace(/蜀汉/g,'蜀');return pool.includes(head)||canon(r.polity)===canon(head);
 }
 function parseYear(s){
  s=norm(s).replace(/年$/,'');if(!s)return {type:'all'};
  if(s.length===2&&GAN.includes(s[0]))return {type:'gz',value:CYCLE[gz(s,'年干支')]};
  if(/^(?:公元)?(?:前\d{1,4}|\d{1,4})$/.test(s))return {type:'number',value:civilYear(s)};
  const match=s.match(/^(.*?)(元|[零一二三四五六七八九十百千廿卅\d]+)$/);
  const name=match?match[1]:s,year=match?number(match[2]):null;
  let found=records.filter(r=>eraMatches(name,r));
  if(!found.length)throw Error('未找到这个纪年。可写“洪武十八”“蜀汉建兴三”，或从纪年索引选择；同名年号会保留全部候选。');
  if(year!==null&&(!Number.isInteger(year)||year<1))throw Error('年号年数须为正整数，可写元年、一年或1年。');
  return {type:'era',records:found,value:year,text:s};
 }
 function parseQuick(text){const s=norm(text);if(!s)throw Error('请先输入查询内容。');
  const date=s.match(/^(前\d+|\d{1,4})[-/.](\d{1,2})[-/.](\d{1,2})$/);if(date)return {reverse:toJdn(civilYear(date[1]),+date[2],+date[3])};
  if(!/[年月日时]/.test(s))return {year:s,month:'',day:'',hour:''};
  const p=s.match(/^([^年月日时]+)年(?:([^年月日时]+)月)?(?:([^年月日时]+)日)?(?:([^年月日时]+)时)?$/);
  if(!p)throw Error('请按“戊申年甲寅月甲子日丙寅时”或“洪武十八年二月己未日”输入。');return {year:p[1],month:p[2]||'',day:p[3]||'',hour:p[4]||''};
 }
 function eraMonthAt(r,j){const m=byStart(r.months,j);return m?{record:r,y:m[2],label:m[3],d:Math.floor(j)-m[0]+1+m[4],s:m[0],e:m[1],yearGZ:CYCLE[m[5]],cycleYear:m[6],monthGZ:CYCLE[m[7]]}:null;}
 function allEras(s,e=s+1,scope='day'){
  s=Math.max(domainStart,s);e=Math.min(domainEnd,e);if(s>=e)return [];
  const y=fromJdn(s).y,lastY=fromJdn(Math.ceil(e)-1).y,cyStart=toJdn(y,1,1),cyEnd=toJdn(lastY+1,1,1),out=[];
  for(const r of records){
   if(r.s===null||r.rejected)continue;
   const coarse=r.precision!=='日'||r.source==='年度补充';
   if(coarse?!(r.e>cyStart&&r.s<cyEnd):!(r.e>s&&r.s<e))continue;
   const at=eraMonthAt(r,Math.max(s,r.s));let rn=at?.y;
   if(!rn&&r.yearPoints){for(const p of r.yearPoints){if(p[0]<=Math.max(s,r.s))rn=p[1];else break;}}
   if(!rn&&r.yearAnchor!==undefined)rn=String(y-r.yearAnchor+1);
   if(!rn&&r.sy!==null&&r.sy!==undefined&&!r.unknownSpan)rn=String(y-r.sy+1);
   const years=coarse?[rn].filter(Boolean):[...new Set(r.months.filter(m=>m[1]>s&&m[0]<e).map(m=>m[2]))];
   out.push({record:r,local:at,year:rn,years:years.length?years:[rn].filter(Boolean),coarse});
  }
  for(const a of data.early)if(y>=a.s&&y<a.e&&!out.some(x=>x.record.polity===a.name))out.unshift({record:{id:'early-'+a.name,polity:a.name,era:'无年号',kind:'上古年代',precision:'约年',displaySpan:a.note.split('；')[0],note:a.note,source:'中国历史纪年简表',s:toJdn(a.s,1,1),e:toJdn(a.e,1,1),months:[]},year:null,coarse:true});
  return out.sort((a,b)=>Number(a.coarse)-Number(b.coarse)||a.record.polity.localeCompare(b.record.polity,'zh-CN')||a.record.s-b.record.s);
 }
 function framesForPolity(polity){
  const rs=records.filter(r=>r.polity===polity&&r.months.length);
  return rs.flatMap(r=>r.months.map(m=>({y:m[6],m:monthOrdinal(m[3]),label:m[3],s:m[0],e:m[1],offset:m[4],gz:CYCLE[m[7]],yearGZ:CYCLE[m[5]],record:r,regnal:m[2],source:r.system}))).sort((a,b)=>a.s-b.s);
 }
 function monthOrdinal(label){const l=norm(label).replace(/月$/,'').replace(/^闰/,'');if(l==='后九')return -9;return number(l);}
 const mainFrames=mainMonths.map(m=>({y:m[0],m:m[1],label:m[2],s:m[3],e:m[4],offset:m[8],gz:m[7].startsWith('春秋')?null:monthGZ(m[6],m[5]),yearGZ:yearGZ(m[0]),source:m[7],raw:m}));
 const polityCache=new Map();
 function hWindows(j,h,boundary){
  let a;if(!h)a=boundary==='zi'?[[0,1380],[1380,1440]]:[[0,1440]];
  else if(h.b===0)a=h.phase==='初'?[[1380,1440]]:h.phase==='正'?[[0,60]]:[[0,60],[1380,1440]];
  else{const s=h.b*120-60;a=h.phase==='初'?[[s,s+60]]:h.phase==='正'?[[s+60,s+120]]:[[s,s+120]];}
  return a.map(([s,e])=>({s:j+s/1440,e:j+e/1440,effective:j+(boundary==='zi'&&s>=1380?1:0)})).filter(w=>!h||h.gz===null||hourGZ(w.effective,h.b)===h.gz);
 }
 function query(input={}){
  const min=input.min===undefined?data.minYear:civilYear(input.min),max=input.max===undefined?data.maxYear:civilYear(input.max);
  if(min<data.minYear||max>data.maxYear||min>max)throw Error('查询范围应在前2070年至2026年之间，起年不得晚于止年。');
  const p={year:parseYear(input.year),month:parseMonth(input.month,input.leap||'all'),day:parseDay(input.day),hour:parseHour(input.hour)},mode=input.mode||'lunar',boundary=input.boundary||'midnight';
  if(input.recordId&&p.year.type==='era')p.year.records=p.year.records.filter(r=>r.id===input.recordId);
  if(p.year.type==='number'&&(p.year.value<data.minYear||p.year.value>data.maxYear))throw Error('本版收录前2070年至2026年，请调整年份。');
  let frames=mode==='lunar'?mainFrames:solarFrames[mode];if(!frames)throw Error('未知历法口径。');
  if(input.polity){if(!polityCache.has(input.polity))polityCache.set(input.polity,framesForPolity(input.polity));frames=polityCache.get(input.polity);}
  const explanations=[];
  if(p.year.type==='era'){
   frames=p.year.records.flatMap(r=>r.months.filter(m=>p.year.value===null||String(m[2])===String(p.year.value)).map(m=>({y:m[6],m:monthOrdinal(m[3]),label:m[3],s:m[0],e:m[1],offset:m[4],gz:CYCLE[m[7]],yearGZ:CYCLE[m[5]],record:r,regnal:m[2],source:r.system}))).sort((a,b)=>a.s-b.s);
   if(p.year.records.some(r=>!r.months.length))explanations.push('部分同名纪年只有年度资料，已另列年度候选，不能据此确认月日。');
  }
  const chosen=frames.filter(f=>{
   if(f.y<min||f.y>max)return false;
   if(p.year.type==='number'&&f.y!==p.year.value)return false;
   if(p.year.type==='gz'&&f.yearGZ!==p.year.value)return false;
   const m=p.month,isLeap=/^(闰|后)/.test(f.label)||f.m<0;
   if(m.leap==='leap'&&!isLeap||m.leap==='regular'&&isLeap)return false;
   if(m.type==='gz'&&f.gz!==m.value)return false;
   if(m.type==='number'&&Math.abs(f.m)!==m.value)return false;
   if(m.type==='label'&&f.label!==m.value)return false;
   if(m.type==='special'&&f.label!==m.value)return false;
   return true;
  }).filter(f=>f.e>domainStart&&f.s<domainEnd).map(f=>({...f,s:Math.max(f.s,domainStart),e:Math.min(f.e,domainEnd),offset:f.offset+Math.max(0,domainStart-f.s)}));
  const perDay=p.day.type!=='all'||!!p.hour,perMonth=p.month.type!=='all'||p.month.leap!=='all';let rows=[];
  if(perDay&&p.day.type==='all'&&chosen.reduce((n,f)=>n+Math.ceil(f.e-f.s),0)>100000)throw Error('只给时辰且范围过宽，会产生十万条以上逐日结果。请补充年干支、年号、月份或日条件，或缩小年份范围后再查。');
  if(perDay){
   for(const f of chosen){
    let first=Math.floor(f.s),last=Math.ceil(f.e)-1,step=1;
    if(p.day.type==='number'&&mode==='lunar'){first=f.s+p.day.value-1-f.offset;last=first;}
    if(!p.hour&&p.day.type==='gz'&&boundary==='midnight'){first+=mod(CYCLE.indexOf(p.day.value)-dayIndex(first),60);step=60;}
    for(let j=first;j<=last;j+=step){
     if(!Number.isInteger(j)||j+1<=f.s||j>=f.e)continue;
     const l=mainAt(j);if(p.day.type==='number'&&mode!=='lunar'&&l?.d!==p.day.value)continue;
     const windows=hWindows(j,p.hour,boundary).filter(w=>p.day.type!=='gz'||dayGZ(w.effective)===p.day.value).map(w=>({s:Math.max(w.s,f.s),e:Math.min(w.e,f.e),effective:w.effective})).filter(w=>w.e-w.s>1e-8);
     if(windows.length)rows.push({kind:'day',y:f.y,j,s:windows[0].s,e:windows.at(-1).e,frame:f,windows});
    }
   }
  }else if(perMonth||p.year.type==='era')rows=chosen.map(f=>({kind:'month',y:f.y,s:f.s,e:f.e,frame:f}));
  else{
   const grouped=new Map();for(const f of chosen){const r=grouped.get(f.y);if(r){r.s=Math.min(r.s,f.s);r.e=Math.max(r.e,f.e);}else grouped.set(f.y,{kind:'year',y:f.y,s:f.s,e:f.e,source:f.source});}
   rows=[...grouped.values()];
  }
  // Xia/Shang and early Zhou have no defensible complete daily lunar table.
  // Year cycle is a backwards mathematical index, explicitly not an attested era.
  if(mode==='lunar'&&!input.polity&&p.year.type!=='era'){
   const earlyEnd=data.firstLunarYear-1;
   for(let y=min;y<=Math.min(max,earlyEnd);y++)if((p.year.type==='all'||p.year.type==='number'&&p.year.value===y||p.year.type==='gz'&&yearGZ(y)===p.year.value))rows.push({kind:'coarse',y,s:toJdn(y,1,1),e:toJdn(y+1,1,1),reason:perDay||perMonth?'该时期缺少可靠逐日农历；仅列年代候选，月日未换算。':'上古年代候选；干支为数学回推，不是出土文献已证实的纪年。'});
   if(rows.some(r=>r.kind==='coarse'))explanations.push('前722年以前只作年代定位，不编造夏商农历。公历日、日干支可作明确标注的数学回推。');
  }
  if(p.year.type==='era')for(const r of p.year.records.filter(r=>!r.months.length)){
   const startYear=r.sy??r.yearAnchor??(r.s===null?null:fromJdn(r.s+180).y);
   if(startYear===null)continue;
   const years=p.year.value===null||r.unknownSpan?Array.from({length:Math.max(0,(r.ey??fromJdn(r.e-1).y)-startYear+1)},(_,i)=>startYear+i):[startYear+p.year.value-1];
   for(const y of years)if(y>=min&&y<=max&&y<=(r.ey??fromJdn(r.e-1).y))rows.push({kind:'coarse',y,s:toJdn(y,1,1),e:toJdn(y+1,1,1),record:r,reason:r.unknownSpan?'该年号起讫未定，仅列相关君主时期的可能范围，年数无法定位。':'该纪年仅有年度索引，不能确认输入的月日。'});
  }
  rows.sort((a,b)=>a.s-b.s||(a.frame?.record?.id||'').localeCompare(b.frame?.record?.id||''));
  if(!rows.length&&input.polity&&!frames.length)explanations.push('该政权已收录年号，但尚无可用的当地逐月历表。可以查看并存年号和基准史历。');
  return {rows,years:[...new Set(rows.map(r=>r.y))],parsed:p,mode,boundary,input,explanations,granularity:perDay?'day':perMonth?'month':'year'};
 }
 function describe(j,minute=null,boundary='midnight'){
  const effective=j+(boundary==='zi'&&minute!==null&&minute>=1380?1:0),b=minute===null?null:Math.floor((minute+60)/120)%12;
  return {j,gregorian:dateText(j),julian:dateText(j,'julian'),weekday:mod(j+1,7),lunar:mainAt(j),dayGZ:dayGZ(effective),hourGZ:b===null?null:hourGZ(effective,b),hourBranch:b===null?null:ZHI[b],official:byStart(solarFrames.official,j+(minute??720)/1440,'s','e'),modern:byStart(solarFrames.modern,j+(minute??720)/1440,'s','e')};
 }
 function searchRecords(q){q=norm(q);return records.filter(r=>!q||norm([r.polity,r.era,r.monarch,r.displaySpan,...r.aliases].join(' ')).includes(q));}
 return {data,records,recordMap,polities,yearMap,mainMonths,mainFrames,solarFrames,domainStart,domainEnd,norm,simp,number,civilYear,parseYear,parseMonth,parseDay,parseHour,parseQuick,mainAt,eraMonthAt,query,describe,allEras,searchRecords,monthOrdinal,excludedSupplement,terms};
}
host.HistoryCalendar={make,GAN,ZHI,CYCLE,MONTHS,DAYS,TERMS,mod,toJdn,fromJdn,yearText,dateText,yearGZ,dayIndex,dayGZ,hourGZ};
})(typeof window==='undefined'?globalThis:window);
