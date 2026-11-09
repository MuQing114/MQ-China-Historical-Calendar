/* 中国历史历日检索 · offline interface. GPL-3.0, 2026-11-09. */
(function(){'use strict';
const C=window.HistoryCalendar,cal=C.make(window.HISTORY_DATA,window.ERA_DATA,window.YEAR_SUPPLEMENT),$=id=>document.getElementById(id);
const WD=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
const FIRST=cal.domainStart,LAST=cal.domainEnd-1,PAGE=10,CATPAGE=30;
const state={result:null,activeYear:1368,viewY:1368,viewM:1,selected:C.toJdn(1368,1,31),page:0,minute:null,minuteProvided:false,catalogue:[],catPage:0,reverse:false};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=C.dateText,yt=C.yearText,pad=n=>String(n).padStart(2,'0');
const within=j=>j>=FIRST&&j<=LAST;
function clock(t,j){let n=Math.max(0,Math.min(1440,Math.round((t-j)*1440)));return `${pad(Math.floor(n/60))}:${pad(n%60)}`;}
function instant(t){let j=Math.floor(t),n=Math.round((t-j)*1440);if(n>=1440){n=0;j++;}return `${fmt(j)} ${pad(Math.floor(n/60))}:${pad(n%60)}`;}
function span(s,e){return `${fmt(Math.floor(s))} — ${fmt(Math.ceil(e)-1)}`;}
function monthText(label){const s=cal.simp(String(label));if(/月$/.test(s))return s;const m=s.match(/^(闰)?(\d+)$/);return (m?(m[1]||'')+(C.MONTHS[Number(m[2])-1]||m[2]):s)+'月';}
const dayText=d=>C.DAYS[d-1]||String(d)+'日';
function lunarText(l){return l?`${yt(l.y)}年 ${monthText(l.label)}${dayText(l.d)}`:'历日未定';}
function regnal(n){return n==='1'||n===1?'元':String(n??'');}
function recordSpan(r){if(r.displaySpan)return cal.simp(r.displaySpan);if(r.s===null)return '起讫未详';const a=r.yearAnchor??C.fromJdn(r.s+180).y,b=C.fromJdn(r.e-1).y;return `${yt(a)}—${yt(b)}年`;}
function err(e){$('error').hidden=false;$('error').textContent=e.message||String(e);}
function clearError(){$('error').hidden=true;$('error').textContent='';}
function guard(fn){return e=>{if(e?.preventDefault)e.preventDefault();try{clearError();fn(e);}catch(x){err(x);}};}
function setTab(which){for(const id of ['gz','solar','lunar']){$('tab-'+id).setAttribute('aria-selected',String(which===id));$('tab-'+id).tabIndex=which===id?0:-1;$('pane-'+id).hidden=which!==id;}}
function rangeInputs(){return {min:$('min-year').value,max:$('max-year').value,leap:$('leap').value,boundary:$('boundary').value};}
function modeHelp(){$('mode-help').textContent={lunar:'按所选史历的岁首换年；数字日指该历的月内日数。闰月通常复用前月干支，古历改制保留原月名。',official:'交节日期当天00:00换节月；数字日仍指基准史历日。1734年后交节日使用现代定气日期参照。',modern:'按现代推算的交节时刻换节月，到分钟。数字日仍指基准史历日，不能用它冒充古代实测时刻。'}[$('mode').value];}
function queryInput(kind='gz'){
 return {...rangeInputs(),year:$(kind==='lunar'?'lunar-year':'gz-year').value,month:$(kind==='lunar'?'lunar-month':'gz-month').value,day:$(kind==='lunar'?'lunar-day':'gz-day').value,hour:kind==='lunar'?'':$('gz-hour').value,mode:kind==='lunar'?'lunar':$('mode').value,polity:kind==='lunar'?$('lunar-polity').value:''};
}
function runQuery(input=queryInput()){
 const result=cal.query(input);state.result=result;state.reverse=false;state.minute=null;state.minuteProvided=false;state.page=0;
 $('inspect-hour').value=result.parsed.hour?String(result.parsed.hour.b):'';
 $('result-kicker').textContent='干支 · 史历 · 纪年查询';
 const y=input.year||'所有年份',m=input.month?` ${input.month}月`:'',d=input.day?` ${input.day}日`:'',h=input.hour?` ${input.hour}时`:'';
 $('result-title').textContent=`${y.replace(/年$/,'')}年${m.replace(/月月/,'月')}${d.replace(/日日/,'日')}${h.replace(/时时/,'时')}`;
 $('result-note').textContent=`${input.min||'前2070'}—${input.max||'2026'}年范围 · ${result.years.length}个候选年份 · ${result.rows.length.toLocaleString()}条记录。点击年份或日期查看。`;
 const notices=[...result.explanations];
 if(result.rows.some(r=>r.record?.doubt||r.frame?.record?.doubt))notices.push('本次含来源存疑的纪年，已保留标记。');
 if(result.rows.some(r=>r.record?.rejected))notices.push('包含来源判为伪作/误记的索引记录；只作资料检索，不证明该年号实际使用。');
 if(!input.month&&!input.day&&!input.hour)notices.push('只输入年份时，显示候选年；选择某年后，可并列查看这一年发生改元或同时存在的政权纪年。');
 $('notices').innerHTML=notices.map(s=>`<p>${esc(s)}</p>`).join('');
 $('empty').hidden=result.rows.length>0;$('export').disabled=!result.rows.length;
 if(result.rows.length){const preferred=result.years.includes(state.activeYear)?state.activeYear:result.years[0];activateYear(preferred);}
 else{$('year-cards').innerHTML='';$('year-overflow').hidden=true;$('matches').hidden=true;renderCalendar();renderDay();}
}
function renderYears(){
 const r=state.result;if(!r)return;const idx=r.years.indexOf(state.activeYear),start=Math.max(0,Math.min(r.years.length-16,idx-7)),shown=r.years.slice(start,start+16);
 $('year-cards').innerHTML=shown.map(y=>{const row=r.rows.find(x=>x.y===y),coarse=row.kind==='coarse';const es=cal.allEras(C.toJdn(y,1,1),C.toJdn(y+1,1,1),'year'),names=[...new Set(es.filter(e=>!e.coarse).map(e=>e.record.polity))];return `<button class="year-card${coarse?' coarse':''}" type="button" data-year="${y}" aria-pressed="${y===state.activeYear}"><span class="year-gz">${C.yearGZ(y)} · ${coarse?'年代候选':'点击查看'}</span><strong class="year-value${y<=0?' bce':''}">${esc(yt(y))}</strong><span class="year-era">${esc((names.length?names.slice(0,3):es.slice(0,2).map(e=>e.record.polity)).join(' / ')||'无已收录纪年')}${names.length>3?' 等':''}</span></button>`;}).join('');
 $('year-cards').querySelectorAll('[data-year]').forEach(b=>b.addEventListener('click',()=>activateYear(+b.dataset.year)));
 $('year-overflow').hidden=r.years.length<=16;
 if(r.years.length>16){$('year-more').innerHTML=r.years.map(y=>`<option value="${y}"${state.activeYear===y?' selected':''}>${esc(yt(y))}年 · ${C.yearGZ(y)}</option>`).join('');}
}
function rowsInYear(){return state.result?.rows.filter(r=>r.y===state.activeYear)||[];}
function activateYear(y){
 state.activeYear=y;state.page=0;renderYears();renderMatches();renderMonths();
 const row=rowsInYear()[0];if(!row)return;
 $('era-scope').value=row.kind==='year'||row.kind==='coarse'?'year':row.kind==='month'?'month':'day';
 chooseRow(row);
}
function chooseRow(row){
 state.minuteProvided=false;state.minute=null;
 if(row.kind==='day'&&state.result?.parsed.hour){const m=Math.round((row.windows[0].s-row.j)*1440);state.minute=m;$('inspect-hour').value=String(state.result.parsed.hour.b);}
 const j=Math.max(FIRST,Math.min(LAST,Math.floor(row.s)));chooseDate(j);
}
function rowInfo(row){
 const f=row.frame,r=f?.record||row.record;if(row.kind==='coarse')return `${r?r.polity+' · '+r.era+'；':''}${row.reason}`;
 if(f&&r){const d=row.kind==='day'?dayText(row.j-Math.floor(f.s)+1+f.offset):'';return `${r.polity} · ${r.era}${regnal(f.regnal)}年 ${monthText(f.label)}${d}（${r.system}）`;}
 if(row.kind==='day')return lunarText(cal.mainAt(row.j));
 if(row.kind==='month')return `${yt(row.y)}年 ${monthText(f.label)} · ${f.gz||'月干支未定'}`;
 return `基准史历 ${C.yearGZ(row.y)}年`;
}
function windowsText(row){return row.windows.map(w=>`${clock(w.s,row.j)}—${clock(w.e,row.j)}${state.result?.parsed.hour?' · '+C.hourGZ(w.effective,state.result.parsed.hour.b)+'时':''}`).join('；');}
function renderMatches(){
 const rows=rowsInYear(),start=state.page*PAGE;
 $('matches').hidden=!rows.length||rows.length===1&&rows[0].kind==='year';
 $('matches-body').innerHTML=rows.slice(start,start+PAGE).map((r,i)=>`<tr><td>${r.kind==='coarse'?`${esc(yt(r.y))}年（年度候选）`:r.kind==='day'?fmt(r.j):span(r.s,r.e)}${r.kind==='month'&&state.result.mode==='modern'?`<span class="matches-info">${instant(r.s)} 起；止点不含</span>`:''}</td><td>${esc(rowInfo(r))}</td><td>${r.kind==='day'?[...new Set(r.windows.map(w=>C.dayGZ(w.effective)))].join(' / ')+'日'+`<span class="matches-info">${esc(windowsText(r))}</span>`:r.kind==='coarse'?'月日未换算':'年/月范围，未指定日'}</td><td><button type="button" class="small-button" data-row="${start+i}">查看</button></td></tr>`).join('');
 $('matches-body').querySelectorAll('[data-row]').forEach(b=>b.addEventListener('click',()=>{const r=rows[+b.dataset.row];$('era-scope').value=r.kind==='coarse'?'year':r.kind==='month'?'month':'day';chooseRow(r);}));
 $('page-note').textContent=`${yt(state.activeYear)}年 · ${rows.length}条，显示 ${Math.min(start+1,rows.length)}—${Math.min(start+PAGE,rows.length)}`;
 $('prev-page').disabled=state.page===0;$('next-page').disabled=start+PAGE>=rows.length;
}
function chooseDate(j,move=true){
 if(!within(j))throw Error('该日期超出本版收录范围（前2070年至2026-11-09）。');
 state.selected=j;const p=C.fromJdn(j);if(move){state.viewY=p.y;state.viewM=p.m;}
 renderCalendar();renderDay();
}
function matched(j){return !!state.result?.rows.some(r=>r.kind!=='coarse'&&(r.kind==='day'?r.j===j:j+1>r.s&&j<r.e));}
function renderCalendar(){
 const y=state.viewY,m=state.viewM,first=C.toJdn(y,m,1),next=m===12?C.toJdn(y+1,1,1):C.toJdn(y,m+1,1);
 $('calendar-title').textContent=`${yt(y)}年 ${m}月`;$('view-year').value=yt(y);$('view-month').value=m;
 let html=Array.from({length:C.mod(first,7)},()=>'<span class="cal-day blank" aria-hidden="true"></span>').join('');
 for(let j=first;j<next;j++){
  const l=cal.mainAt(j),label=l?(l.d===1?monthText(l.label):dayText(l.d)):'历日未定';
  html+=`<button type="button" class="cal-day${matched(j)?' match':''}" data-j="${j}" aria-pressed="${j===state.selected}" aria-label="公历${fmt(j)}，${esc(lunarText(l))}，${C.dayGZ(j)}日${l?'':'（数学回推）'}"${within(j)?'':' disabled'}><span class="solar-number">${j-first+1}</span><span class="lunar-name${l?'':' unknown'}">${esc(label)}</span><span class="day-gz">${C.dayGZ(j)}</span></button>`;
 }
 $('calendar-grid').innerHTML=html;
 $('calendar-grid').querySelectorAll('button:not(:disabled)').forEach(b=>b.addEventListener('click',()=>{state.minute=null;state.minuteProvided=false;$('inspect-hour').value='';$('era-scope').value='day';chooseDate(+b.dataset.j,false);}));
 $('prev-month').disabled=first<=FIRST;$('next-month').disabled=next>LAST;
}
function inspectMinute(){return $('inspect-hour').value===''?null:state.minute??Number($('inspect-hour').value)*120;}
function renderDay(){
 const j=state.selected,minute=inspectMinute(),boundary=$('boundary').value,d=cal.describe(j,minute,boundary),l=d.lunar;
 $('selected-title').textContent=d.gregorian;$('selected-weekday').textContent=`${WD[d.weekday]} · 公历（格里高利规则）`;
 $('day-facts').innerHTML=`<dl class="fact-list"><div><dt>基准农历 / 史历</dt><dd>${l?esc(lunarText(l)):'<span class="no-lunar">历日未定 · 不编造上古农历</span>'}${l?`<br><span class="month-source">${esc(l.source==='table'?'历史历表（历法随时代调整）':l.source)}</span>`:''}</dd></div><div><dt>儒略历对照</dt><dd>${d.julian}</dd></div><div><dt>并存政权纪年</dt><dd>下方逐项列出，含当地历日和精度</dd></div></dl>`;
 $('pillars').innerHTML=[['史历年干支',l?.yearGZ||'未定'],['史历月干支',l?.monthGZ||'未定'],['日干支',d.dayGZ]].map(([label,v])=>`<div class="pillar"><strong>${esc(v)}</strong><span>${esc(label)}</span></div>`).join('');
 const terms=cal.terms.modern.filter(t=>Math.floor(t[0])===j),offTerms=cal.terms.official.filter(t=>Math.floor(t[0])===j);
 let note=l?'':`<span class="no-lunar">本日公历、儒略历及日干支是数学回推；不能据此断言夏商某日实际采用的历法。</span><br>`;
 note+='<b>节月对照</b><br>历书节月：'+(d.official?`${d.official.yearGZ}年 ${d.official.gz}月`:'无独立资料')+'<br>现代节月：'+(d.modern?`${d.modern.yearGZ}年 ${d.modern.gz}月`:'未收录到该时期');
 if(offTerms.length)note+='<br>历书交节日：'+offTerms.map(t=>C.TERMS[t[1]]+(t[3]?'（现代参照）':'')).join('、');
 if(terms.length)note+='<br>现代推算：'+terms.map(t=>C.TERMS[t[1]]+' '+clock(t[0],j)).join('、');
 if(terms.some(t=>t[1]%2===0))note+=`<br><span class="hint">本日交节，节月取${minute===null?'12:00参照':clock(j+minute/1440,j)}；具体分界以推算时刻为准。</span>`;
 if(boundary==='zi')note+='<br><span class="hint">23:00起日干支进入次日；农历日期仍依本日民用日界。</span>';
 $('day-note').innerHTML=note;
 if(minute===null)$('hour-result').innerHTML='<span class="hint">未指定时刻。可选择时辰查看约两小时的钟面区间。</span>';
 else{
  const b=+$('inspect-hour').value,ranges=b===0?[[0,60],[1380,1440]]:[[b*120-60,b*120+60]];
  $('hour-result').innerHTML=ranges.map(([a,z])=>{const eff=j+(boundary==='zi'&&a>=1380?1:0);return `<strong>${C.hourGZ(eff,b)}时</strong> ${clock(j+a/1440,j)}—${clock(j+z/1440,j)}`;}).join('<br>')+(state.minuteProvided?`<br>指定时刻：${clock(j+minute/1440,j)} · ${d.hourGZ}时`:'')+'<br><span class="hint">钟面区间；未经地方真太阳时校正。</span>';
 }
 renderConcurrent();renderMonths();$('copy-status').textContent='';
}
function sourceDetails(r){
 const url=r.url||(r.source==='CeJS'?'https://github.com/kanasimi/CeJS':r.source==='年度补充'?'https://zh.wikipedia.org/wiki/中国年号列表':null);
 const bits=[`来源：${r.source||'年代简表'}；精度：${r.precision||'未定'}。`,r.monarch?`君主/使用者：${r.monarch}`:'',r.accuracy?`精度说明：${r.accuracy}`:'',r.calendarIssue,r.calendarName?`历法：${r.calendarName}`:'',r.note,r.basis?`依据：${r.basis}`:''];
 if(r.source==='CeJS')bits.push('日级边界依来源历表，可能包含年初追记或继用；不直接当成实际宣告改元或政权建亡日期。');
 if(r.source==='年度补充')bits.push('只确认到公历年度；年内何日生效未定，不能据年度边界推断当日实际在用。');
 if(r.unknownSpan)bits.push('起讫不详；此处仅有相关君主在位时期的可能范围，无法计算确定的年号年数。');
 return `<details><summary>来源与原注</summary><div class="source-note">${bits.filter(Boolean).map(esc).join('<br>')}${url?`<br><a href="${esc(url)}" target="_blank" rel="noreferrer">来源网页 ↗（可选联网）</a>`:''}</div></details>`;
}
function eraEntry(x,scope){
 const r=x.record,l=x.local,coarse=x.coarse;
 const yr=x.year&&!r.unknownSpan?(scope!=='day'&&x.years?.length>1?x.years.map(regnal).join('、'):regnal(x.year))+'年':'';
 const label=r.kind==='纪年制度'&&r.era==='公元'?`公元${x.year}年 · 无帝王年号`:r.era==='无年号'?'无年号':r.era+yr;
 const local=l?`${r.system==='公历'?'公历':r.system==='太平天历'?'太平天历':'当地史历'}：${monthText(l.label)}${dayText(l.d)}`:'当地月日未核定';
 let detail=coarse?`${recordSpan(r)} · ${r.unknownSpan?'起讫不详，仅为可能范围':'仅到'+(r.precision||'年')+'级'}`:scope==='day'?local:`该记录范围：${span(r.s,r.e)}（历表边界）`;
 if(coarse&&yr)detail+=` · ${r.era}${yr}为年度定位`;
 return `<article class="era-entry"><div class="polity">${esc(r.polity)} <span class="badge${coarse?' coarse':''}">${esc(coarse?'年度候选':r.kind==='纪年制度'?'近现代纪年':'历表对照')}</span>${r.doubt||r.unknownSpan?'<span class="badge doubt">存疑 / 不详</span>':''}</div><p class="era-label">${esc(label)}</p><p class="local-date">${esc(detail)}</p>${r.kind==='君主纪年'||r.kind==='政治纪年'?'<p class="local-date">君主/政治纪年；此名称本身不是年号。</p>':''}${sourceDetails(r)}</article>`;
}
function renderConcurrent(){
 const p=C.fromJdn(state.selected),scope=$('era-scope').value;
 const s=scope==='year'?C.toJdn(p.y,1,1):scope==='month'?C.toJdn(p.y,p.m,1):state.selected;
 const e=scope==='year'?C.toJdn(p.y+1,1,1):scope==='month'?(p.m===12?C.toJdn(p.y+1,1,1):C.toJdn(p.y,p.m+1,1)):s+1;
 const all=cal.allEras(s,e,scope),exact=all.filter(x=>!x.coarse),coarse=all.filter(x=>x.coarse);
 $('concurrent-title').textContent=scope==='year'?`公历${yt(p.y)}年出现的纪年`:scope==='month'?`公历${yt(p.y)}年${p.m}月出现的纪年`:`${fmt(state.selected)} 的纪年对照`;
 $('concurrent-note').textContent=`${exact.length}条历表记录，${coarse.length}条年度候选。${scope==='day'?'年度候选不证明这一日仍在使用。':'本范围内先后改元与并存政权一起列出，不代表所有年号同时使用。'}同政权的异说、继用或复称保留独立记录。`;
 $('era-results').innerHTML=(exact.length?`<h3 class="era-subtitle">${scope==='day'?'本日历表对照':'范围内的历表纪年'}</h3><div class="era-list">${exact.map(x=>eraEntry(x,scope)).join('')}</div>`:'')+(coarse.length?`<h3 class="era-subtitle">年度候选与未定界限 · 不作确定日级断言</h3><div class="era-list">${coarse.map(x=>eraEntry(x,scope)).join('')}</div>`:'')+(!all.length?'<p class="hint">当前没有可用的政权纪年记录。可在下方总索引中查找异名或不详条目。</p>':'');
}
function renderMonths(){
 const selected=cal.mainAt(state.selected),y=selected?.y??C.fromJdn(state.selected).y,ms=cal.yearMap.get(y)||[];
 $('year-months-title').textContent=`展开 ${yt(y)}年基准史历月表 · ${ms.length}个月份/历法片段`;
 $('year-months-body').innerHTML=ms.length?ms.map(m=>{const f=cal.mainAt(m[3]);return `<tr><td><button type="button" class="text-button" data-start="${m[3]}">${esc(monthText(m[2]))}</button></td><td>${f?.monthGZ||'未定'}</td><td>${span(m[3],m[4])}</td><td>${m[4]-m[3]}天${m[8]?'（月中片段）':''}</td></tr>`;}).join(''):'<tr><td colspan="4">该年缺少可靠逐日农历，不生成月份表。</td></tr>';
 $('year-months-body').querySelectorAll('[data-start]').forEach(b=>b.addEventListener('click',guard(()=>chooseDate(+b.dataset.start))));
}
function reverseDate(j,minute=null){
 if(!within(j))throw Error('该日期超出前2070年至2026-11-09的收录范围。');
 clearError();state.result=null;state.reverse=true;state.minute=minute;state.minuteProvided=minute!==null;state.activeYear=C.fromJdn(j).y;
 $('inspect-hour').value=minute===null?'':String(Math.floor((minute+60)/120)%12);$('era-scope').value='day';
 $('result-kicker').textContent='日期反查';$('result-title').textContent=`公历 ${fmt(j)}`;
 $('result-note').textContent='基准史历、干支及同日各政权纪年并列。月日未定的记录另列年度候选。';
 $('notices').innerHTML=cal.mainAt(j)?'':'<p>该时期无可靠逐日农历；下列公历、儒略历和日干支只作数学回推。</p>';
 $('year-cards').innerHTML='';$('year-overflow').hidden=true;$('matches').hidden=true;$('empty').hidden=true;$('export').disabled=false;
 chooseDate(j);
}
function parseSolar(){const m=$('solar-date').value.trim().match(/^(前\d+|\d{1,4})[-/.](\d{1,2})[-/.](\d{1,2})$/);if(!m)throw Error('请按1385-04-15或前722-02-01填写。');return C.toJdn(cal.civilYear(m[1]),+m[2],+m[3],$('solar-kind').value);}
function csvText(lines){return '\ufeff'+lines.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');}
function download(text,name){const b=new Blob([text],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function resultCSV(){
 const lines=[['记录精度','公历起日','公历止日','儒略起日','候选年份','史历或纪年','日干支','匹配时段','范围内政权纪年','来源/限制']];
 const rows=state.result?.rows||[{kind:'day',y:C.fromJdn(state.selected).y,j:state.selected,s:state.selected,e:state.selected+1,windows:[]}];
 for(const r of rows){const s=Math.floor(r.s),e=Math.ceil(r.e)-1,er=cal.allEras(s,e+1).map(x=>`${x.record.polity}·${x.record.era}${x.year&&!x.record.unknownSpan?regnal(x.year)+'年':''}${x.coarse?'[年度候选]':''}${x.record.doubt?'[存疑]':''}`).join('；');const dg=r.kind==='day'?(r.windows.length?[...new Set(r.windows.map(w=>C.dayGZ(w.effective)))].join('/'):cal.describe(r.j,inspectMinute(),$('boundary').value).dayGZ):'';lines.push([r.kind==='coarse'?'年度候选':r.kind,s===e?fmt(s):fmt(s),fmt(e),fmt(s,'julian'),yt(r.y),rowInfo(r),dg,r.kind==='day'&&r.windows.length?windowsText(r):'',er,r.reason||r.frame?.source||'基准史历']);}
 return csvText(lines);
}
function recordQuery(r){
 if(r.s===null||r.unknownSpan){$('catalogue-search').value=r.era;searchCatalogue();err(Error('此记录起讫不详，已保留来源原注，不能换算为确定日期。'));return;}
 setTab('gz');$('gz-year').value=r.polity+r.era;$('quick').value=r.polity+r.era+'年';$('gz-month').value='';$('gz-day').value='';$('gz-hour').value='';$('mode').value='lunar';$('leap').value='all';setEpoch('all',false);modeHelp();
 const input=queryInput();
 // An id-scoped query retains ambiguous era names without guessing a polity.
 runQuery({...input,year:r.era,recordId:r.id});
 $('result-title').textContent=r.polity+' · '+r.era+'（全部已知年次）';
 $('result-title').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderCatalogue(){
 const rs=state.catalogue,start=state.catPage*CATPAGE;
 $('catalogue-count').textContent=`收录${cal.records.length.toLocaleString()}条纪年记录、${cal.polities.length}个来源政权/地方势力标签；本次筛出${rs.length.toLocaleString()}条。名称不同、异说及疑伪条目保留原注，不等于已核定的独立政权总数。`;
 $('catalogue-body').innerHTML=rs.slice(start,start+CATPAGE).map(r=>`<tr><td>${esc(r.polity)}</td><td><span class="catalogue-name">${esc(r.era)}</span><span class="matches-info">${esc(r.monarch||r.kind)}</span>${r.rejected?'<span class="badge doubt">来源判伪/误记</span>':r.doubt||r.unknownSpan?'<span class="badge doubt">存疑 / 不详</span>':''}</td><td>${esc(recordSpan(r))}<br><span class="badge${r.precision!=='日'?' coarse':''}">${esc(r.precision||'未定')}级</span>${r.months.length?' · 有当地历表':' · 无当地月日表'}</td><td><button class="small-button" type="button" data-record="${r.id}">查此纪年</button>${sourceDetails(r)}</td></tr>`).join('')||'<tr><td colspan="4">未找到记录。可试简体、繁体、政权或君主名。</td></tr>';
 $('catalogue-body').querySelectorAll('[data-record]').forEach(b=>b.addEventListener('click',guard(()=>recordQuery(cal.recordMap.get(b.dataset.record)))));
 $('catalogue-page').textContent=`${rs.length}条 · 第${rs.length?state.catPage+1:0}/${Math.ceil(rs.length/CATPAGE)}页 · 显示${Math.min(start+1,rs.length)}—${Math.min(start+CATPAGE,rs.length)}`;
 $('catalogue-prev').disabled=state.catPage===0;$('catalogue-next').disabled=start+CATPAGE>=rs.length;
}
function searchCatalogue(){state.catPage=0;state.catalogue=cal.searchRecords($('catalogue-search').value);renderCatalogue();}
function catalogueCSV(){return csvText([['政权/地方势力','纪年','君主/使用者','年代范围','资料精度','存疑','起讫不详','来源判伪/误记','有当地历表','来源','原注'],...state.catalogue.map(r=>[r.polity,r.era,r.monarch,recordSpan(r),r.precision,!!r.doubt,!!r.unknownSpan,!!r.rejected,!!r.months.length,r.source,r.note])]);}
async function copyDay(){
 const d=cal.describe(state.selected,inspectMinute(),$('boundary').value),entries=cal.allEras(state.selected),parts=[`公历（格里高利规则向前推算）：${d.gregorian} ${WD[d.weekday]}`,`儒略历：${d.julian}`,`基准史历：${lunarText(d.lunar)}`,`干支：${d.lunar?.yearGZ||'年未定'}年 ${d.lunar?.monthGZ||'月未定'}月 ${d.dayGZ}日（${$('boundary').value==='zi'?'23:00':'00:00'}换日）`];
 if($('inspect-hour').value!=='')parts.push((state.minuteProvided?'指定时刻：'+clock(state.selected+inspectMinute()/1440,state.selected)+'；':'')+$('hour-result').innerText);
 parts.push('政权纪年：',...entries.map(x=>`${x.record.polity}：${x.record.era}${x.year&&!x.record.unknownSpan?regnal(x.year)+'年':''}${x.local?' '+monthText(x.local.label)+dayText(x.local.d):''} [${x.coarse?'年度候选，非本日断言':'来源历表对照'}${x.record.doubt?'；存疑':''}]`));
 if(!d.lunar)parts.push('上古公历和干支为数学回推，无可靠逐日农历。');
 const text=parts.join('\n');try{await navigator.clipboard.writeText(text);$('copy-status').textContent='已复制';}catch(_){const ta=document.createElement('textarea');ta.value=text;document.body.append(ta);ta.select();$('copy-status').textContent=document.execCommand('copy')?'已复制':'浏览器不允许复制';ta.remove();}
}
const EPOCHS={all:['前2070','2026'],early:['前2070','前771'],zhou:['前770','前221'],han:['前221','220'],divided:['220','589'],tang:['581','960'],song:['907','1279'],yuan:['1206','1368'],ming:['1368','1644'],qing:['1644','1912'],modern:['1912','2026']};
function setEpoch(name,run=true){const p=EPOCHS[name];$('min-year').value=p[0];$('max-year').value=p[1];document.querySelectorAll('[data-epoch]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.epoch===name)));if(run)runQuery(queryInput($('pane-lunar').hidden?'gz':'lunar'));}
for(const id of ['gz','solar','lunar']){$('tab-'+id).addEventListener('click',()=>setTab(id));$('tab-'+id).addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const ids=['gz','solar','lunar'],n=e.key==='Home'?0:e.key==='End'?2:C.mod(ids.indexOf(id)+(e.key==='ArrowRight'?1:-1),3);setTab(ids[n]);$('tab-'+ids[n]).focus();});}
$('gz-form').addEventListener('submit',guard(()=>runQuery()));
$('lunar-form').addEventListener('submit',guard(()=>runQuery(queryInput('lunar'))));
$('quick-form').addEventListener('submit',guard(()=>{const p=cal.parseQuick($('quick').value);if(p.reverse!==undefined){setTab('solar');$('solar-date').value=fmt(p.reverse);$('solar-kind').value='gregorian';$('solar-time').value='';reverseDate(p.reverse);}else{for(const k of ['year','month','day','hour'])$('gz-'+k).value=p[k];$('leap').value='all';runQuery();}}));
$('solar-form').addEventListener('submit',guard(()=>{const t=$('solar-time').value;reverseDate(parseSolar(),t?+t.slice(0,2)*60 + +t.slice(3,5):null);}));
$('today').addEventListener('click',guard(()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),get=t=>p.find(x=>x.type===t).value;const j=C.toJdn(+get('year'),+get('month'),+get('day'));$('solar-date').value=fmt(j);$('solar-kind').value='gregorian';$('solar-time').value='';reverseDate(j);}));
$('mode').addEventListener('change',modeHelp);
document.querySelectorAll('[data-epoch]').forEach(b=>b.addEventListener('click',guard(()=>setEpoch(b.dataset.epoch))));
document.querySelectorAll('[data-example]').forEach(b=>b.addEventListener('click',guard(()=>{setTab('gz');$('mode').value='lunar';$('boundary').value='midnight';modeHelp();const which=b.dataset.example;setEpoch(which==='ming'?'ming':'all',false);$('quick').value=which==='ming'?'戊申年':which==='three'?'225-06-01':'大理天开三年';$('quick-form').requestSubmit();})));
$('year-more').addEventListener('change',()=>activateYear(+$('year-more').value));
$('prev-page').addEventListener('click',()=>{state.page--;renderMatches();});$('next-page').addEventListener('click',()=>{state.page++;renderMatches();});
$('calendar-jump').addEventListener('submit',guard(()=>{const y=cal.civilYear($('view-year').value);if(y<cal.data.minYear||y>cal.data.maxYear)throw Error('月历年份超出收录范围。');state.minute=null;state.minuteProvided=false;chooseDate(C.toJdn(y,+$('view-month').value,1));}));
for(const [id,delta] of [['prev-month',-1],['next-month',1]])$(id).addEventListener('click',guard(()=>{let y=state.viewY,m=state.viewM+delta;if(m===0){m=12;y--;}if(m===13){m=1;y++;}const j=C.toJdn(y,m,1);if(!within(j))return;state.viewY=y;state.viewM=m;renderCalendar();}));
$('inspect-hour').addEventListener('change',()=>{state.minute=null;state.minuteProvided=false;renderDay();});
$('boundary').addEventListener('change',()=>{renderDay();if(state.result)$('notices').innerHTML+='<p>换日规则已更新；如需重新筛选匹配结果，请重新点击检索。</p>';});
$('era-scope').addEventListener('change',renderConcurrent);
$('export').addEventListener('click',guard(()=>download(resultCSV(),'中国历史历日查询结果.csv')));$('copy-day').addEventListener('click',copyDay);
$('catalogue-form').addEventListener('submit',guard(searchCatalogue));$('catalogue-clear').addEventListener('click',()=>{$('catalogue-search').value='';searchCatalogue();});
$('catalogue-prev').addEventListener('click',()=>{state.catPage--;renderCatalogue();});$('catalogue-next').addEventListener('click',()=>{state.catPage++;renderCatalogue();});
$('catalogue-export').addEventListener('click',()=>download(catalogueCSV(),'中国历史纪年索引.csv'));
$('view-month').innerHTML=C.MONTHS.map((m,i)=>`<option value="${i+1}">${i+1}月</option>`).join('');
$('inspect-hour').innerHTML='<option value="">未指定时刻</option>'+[...C.ZHI].map((s,i)=>`<option value="${i}">${s}时 · ${i===0?'23—01':pad(i*2-1)+'—'+pad(i*2+1)}</option>`).join('');
$('lunar-polity').innerHTML+=[...cal.polities].map(p=>`<option value="${esc(p)}">${esc(p)}${cal.records.some(r=>r.polity===p&&r.months.length)?'':'（仅年度）'}</option>`).join('');
$('era-suggestions').innerHTML=C.CYCLE.concat([...new Set(cal.records.map(r=>r.polity+r.era))]).map(s=>`<option value="${esc(s)}"></option>`).join('');
$('footer-stats').textContent=`${cal.mainMonths.length.toLocaleString()}个主历片段 · ${cal.records.length.toLocaleString()}条纪年 · 数据截至2026年`;
modeHelp();setEpoch('all',false);runQuery();searchCatalogue();
window.HistoryApp={calendar:cal,state,runQuery,reverseDate,chooseDate,resultCSV,catalogueCSV,searchCatalogue,setEpoch};
})();
