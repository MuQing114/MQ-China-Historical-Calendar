/* Historical main-calendar compilation from Y. T. Liu/ChineseCalendar,
 * GPL-3.0. 2026-11-09: full historical span, reform-era month labels preserved.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'sources/ChineseCalendar/src');
const c={};vm.createContext(c);
for(const f of ['calendarData','utilities','calendar','ancientCalendars','decompressSunMoonData'])vm.runInContext(fs.readFileSync(path.join(dir,f+'.js'),'utf8'),c);
const FIRST_ANCIENT=-721,MAX_YEAR=2026,table=c.ChineseToGregorian();
const monthNames=['正','二','三','四','五','六','七','八','九','十','十一','十二'];
const all=[];
function label(m,y,ancient=false){
  if(ancient&&m<0)return y>=-220?'后九':'闰';
  let t=monthNames[Math.abs(m)-1];
  if(y>688&&y<700&&Math.abs(m)===11)t='正';
  if(y>689&&y<701&&Math.abs(m)===1)t='一';
  return (m<0?'闰':'')+t;
}
// Calendar table begins at Taichu reform. Columns refer to Xia month builds,
// not always the contemporary displayed month number or displayed year.
let cutoff;
for(const row of table.filter(r=>r[0]>=-104&&r[0]<=MAX_YEAR+1)){
  const y=row[0],jan0=Math.floor(c.getJD(y-1,12,31)+0.5);
  if(y===-104)cutoff=jan0+row[5];
  const s=c.sortMonths(row);
  for(let i=0;i<s.cmonthDate.length;i++){
    const jian=s.cmonthNum[i],info=c.jianToMonthYearoffset(jian,y,'default'),m=info.monNum;
    const a=jan0+s.cmonthDate[i],b=jan0+(i+1<s.cmonthDate.length?s.cmonthDate[i+1]:row[1]+row[15]);
    if(a<cutoff)continue;
    // [lunar/reign-style year, numeric month, display month, start JDN,
    //  end exclusive, month build, Xia year, source calendar, day offset]
    all.push([y+info.yearOffset,m,label(m,y),a,b,Math.abs(jian),y,'table',0]);
  }
}
for(let y=FIRST_ANCIENT;y<=-104;y++){
  const jd0=Math.floor(c.getJD(y-1,12,30)+1),ndays=c.NdaysGregJul(y),jan1=jd0+2,next=jan1+ndays;
  let a,kind;
  if(y>=-220){kind='秦汉颛顼历复原';a=c.calDataYear_HanZhuanXu(y,jd0,ndays,[],[],[],[],[],[]);}
  else {kind=y<-479?'春秋鲁历复原':'战国颛顼历复原';a=c.calDataYear_ancient(y,jd0,ndays,[],[],[],[],[],[],y<-479?'Chunqiu':'Zhuanxu');}
  for(let i=0;i<a.cmonthDate.length;i++){
    const rawStart=jd0+1+a.cmonthDate[i],rawEnd=rawStart+(a.cmonthLong[i]?30:29);
    let s=Math.max(rawStart,jan1),e=Math.min(rawEnd,next,cutoff);
    if(e<=s)continue;
    const m=a.cmonthNum[i],cy=y+a.cmonthYear[i]-1;
    all.push([cy,m,label(m,y,true),s,e,Math.abs(a.cmonthJian[i]),y+(a.cmonthXiaYear[i]||0)-1,kind,s-rawStart]);
  }
}
all.sort((a,b)=>a[3]-b[3]);
// Consecutive civil-year slices of the same lunar month are combined. Calendar
// changes remain distinct when the source uses different month labels.
const months=[];
for(const m of all){
  const p=months.at(-1);
  if(p&&p[4]===m[3]&&p[0]===m[0]&&p[2]===m[2]&&p[7]===m[7]&&p[8]+p[4]-p[3]===m[8])p[4]=m[4];
  else months.push(m);
}
const audit=[];
for(let i=1;i<months.length;i++)if(months[i-1][4]!==months[i][3])audit.push({before:months[i-1],after:months[i]});
if(audit.length)throw Error('Main calendar gap or overlap: '+JSON.stringify(audit.slice(0,5)));
const ping=[],modern=[],pRaw=c.calendricalSolarTerms(),mRaw=c.solarTerms(),ps=c.calendricalSolarTerms_ystart(),ms=c.solarTermMoonPhase_ystart();
for(let y=FIRST_ANCIENT;y<=MAX_YEAR+1;y++){
  const jan0=Math.floor(c.getJD(y-1,12,31)+0.5);
  if(y>=-104&&pRaw[y-ps]){
    const p=pRaw[y-ps].slice();for(let i=1;i<p.length;i++)p[i]+=p[i-1]+14;
    p.forEach((d,i)=>ping.push([jan0+d,i,y]));
  }else if(y>=-220&&y<-104)c.ZhuanXu_pingqi(y,jan0).forEach((d,i)=>ping.push([jan0+d,i,y]));
  else if(y>=-479&&y<-220)c.guliuli_pingqi(y,jan0,...(()=>{const p=c.guliuli_calendar_parameters('Zhuanxu');return[p.yEpoch,p.jdEpoch];})()).forEach((d,i)=>ping.push([jan0+d,i,y]));
  const p=mRaw[y-ms].slice(),w=p.pop(),v=c.decompress_solarTerms(y,1,c.offsets_sunMoon().solar,p);
  v.push(c.decompress_solarTerms(y+1,0,c.offsets_sunMoon().solar,[w])[0]+c.NdaysGregJul(y)*1441);
  v.forEach((t,i)=>{const d=Math.floor(t/1441),minute=Math.min(1439.9,t-d*1441);modern.push([Number((jan0+d+minute/1440).toFixed(8)),i,y]);});
  if(y>=-104&&!pRaw[y-ps])modern.slice(-24).forEach(t=>ping.push([Math.floor(t[0]),t[1],y,'modern-reference']));
}
const unique=a=>Array.from(new Map(a.map(t=>[t[0]+':'+t[1],t])).values()).sort((a,b)=>a[0]-b[0]);
const data={version:'2.0.0',built:'2026-11-09',lastDate:[2026,11,9],minYear:-2069,maxYear:MAX_YEAR,firstLunarYear:FIRST_ANCIENT,mainMonths:months,ping:unique(ping),modern:unique(modern),source:{name:'Y. T. Liu / ChineseCalendar',commit:'719e02ff011ab122aad5fb29084e3f6ee8b65390',license:'GPL-3.0'},early:[{name:'夏',s:-2069,e:-1599,approx:true,note:'约前2070—约前1600年；无可靠逐日历表，无年号制度。'},{name:'商',s:-1599,e:-1045,approx:true,note:'约前1600—前1046年；具体年序及历日须按出土文献另考，无年号制度。'},{name:'西周',s:-1045,e:-769,approx:true,note:'前1046—前771年；前841年以前年代多有异说。共和以后按来源君主纪年并列。'}]};
fs.writeFileSync(path.join(root,'dist/calendar-data.js'),'/* ChineseCalendar / Y. T. Liu; GPL-3.0. Full sources distributed with tool. */\nwindow.HISTORY_DATA='+JSON.stringify(data)+';\n');
fs.writeFileSync(path.join(root,'sources/calendar-compilation-report.json'),JSON.stringify({months:months.length,first:months[0],last:months.at(-1),gaps:audit.length,cutoff,modern:modern.length,ping:ping.length},null,2));
console.log(JSON.stringify({months:months.length,modern:modern.length,ping:ping.length,bytes:fs.statSync(path.join(root,'dist/calendar-data.js')).size}));
