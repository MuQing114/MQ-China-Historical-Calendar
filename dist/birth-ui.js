/* Offline birth-chart interface, 2.1.0, GPL-3.0. No input is persisted. */
(function(){'use strict';
const C=window.HistoryCalendar,B=window.BirthCalendar,cal=window.HistoryApp.calendar,birth=B.make(cal),$=id=>document.getElementById(id);
const state={dates:[],options:null,result:null,active:0};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0'),clock=n=>`${pad(Math.floor(n/60))}:${pad(n%60)}`;
const elemClass=e=>'el-'+B.EL.indexOf(e);
function monthText(l){const s=String(l),a=s.match(/^(闰)?(\d+)$/);return a?(a[1]||'')+(C.MONTHS[+a[2]-1]||a[2])+'月':s.replace(/月$/,'')+'月';}
function lunarText(l){return l?`${C.yearText(l.y)}年 ${monthText(l.label)}${C.DAYS[l.d-1]||l.d+'日'}`:'农历月日未定';}
const times=(chart,result)=>result.time.exact?result.time.label:chart.windows.map(([a,z])=>`${clock(a)}—${clock(z)}`).join('、')+'（止点不含）';
function error(e){$('birth-error').textContent=e.message||String(e);$('birth-error').hidden=false;}
function clearError(){$('birth-error').hidden=true;$('birth-error').textContent='';}
function dirty(){state.result=null;state.dates=[];$('birth-result').hidden=true;$('birth-date-choice-wrap').hidden=true;$('birth-welcome').hidden=false;clearError();}
function fields(){const lunar=$('birth-calendar').value==='lunar',time=$('birth-time-mode').value;$('birth-solar-fields').hidden=lunar;$('birth-lunar-fields').hidden=!lunar;$('birth-time-field').hidden=time!=='exact';$('birth-branch-field').hidden=time!=='branch';}
function inputs(){return {calendar:$('birth-calendar').value,date:$('birth-date').value,year:$('birth-lunar-year').value,month:$('birth-lunar-month').value,day:$('birth-lunar-day').value,leap:$('birth-leap').value,polity:$('birth-polity').value,timeMode:$('birth-time-mode').value,time:$('birth-time').value,branch:$('birth-branch').value,termMode:$('birth-term-mode').value,boundary:$('birth-boundary').value,offset:$('birth-offset').value};}
function generate(){
 clearError();state.options=inputs();state.dates=birth.resolve(state.options);state.result=null;state.active=0;
 $('birth-welcome').hidden=true;
 if(state.dates.length>1){
  $('birth-result').hidden=true;$('birth-date-choice-wrap').hidden=false;
  $('birth-date-choice').innerHTML='<option value="">请选定实际出生日期</option>'+state.dates.map((d,i)=>`<option value="${i}">${C.dateText(d.j)} · ${esc(d.source)}</option>`).join('');
 }else{$('birth-date-choice-wrap').hidden=true;selectDate(0);}
}
function selectDate(i){const d=state.dates[i];if(!d)return;state.result=birth.build({...state.options,...d});state.active=0;render();}
function render(){
 const r=state.result;if(!r)return;const ch=r.charts[state.active];$('birth-result').hidden=false;$('birth-welcome').hidden=true;
 $('birth-result-label').textContent=r.charts.length>1?`${r.charts.length}种时间候选 · 查看${state.active+1}/${r.charts.length}`:ch.complete?'四柱八字 · 已按所选规则排盘':'三柱 / 缺项参考 · 时辰或历表未定';
 $('birth-result-title').textContent=ch.eightChars;
 $('birth-date-note').textContent=`公历 ${r.date} · ${lunarText(r.lunar)} · ${r.time.label} · UTC${r.offset>=0?'+':''}${r.offset}。`;
 $('birth-notes').innerHTML=r.notes.map(n=>`<p>${esc(n)}</p>`).join('');
 $('birth-chart-choices').innerHTML=r.charts.length>1?r.charts.map((c,i)=>`<button type="button" data-birth-chart="${i}" aria-pressed="${i===state.active}"><span>候选${i+1} · ${esc(times(c,r))}</span><strong>${esc(c.eightChars)}</strong></button>`).join(''):'';
 $('birth-chart-choices').querySelectorAll('[data-birth-chart]').forEach(btn=>btn.addEventListener('click',()=>{state.active=+btn.dataset.birthChart;render();}));
 $('birth-pillars').innerHTML=ch.pillars.map(p=>`<article class="birth-pillar"><p class="birth-pillar-role">${p.role}</p><div class="birth-glyphs">${p.gz?`<span class="${elemClass(p.stem.element)}">${p.gz[0]}</span><span class="${elemClass(p.branch.element)}">${p.gz[1]}</span>`:'<span class="birth-unknown">未定</span>'}</div><p class="birth-nayin${p.nayin?' '+elemClass(p.nayin.element):''}">${esc(p.nayin?.name||'纳音未定')}</p><p class="birth-nayin-el">${p.nayin?'纳音属'+p.nayin.element:(p.role==='时柱'?'不补造时柱':'历表资料不足')}</p><dl><div><dt>干支本气</dt><dd>${p.gz?p.stem.element+' · '+p.branch.element:'—'}</dd></div><div><dt>天干十神</dt><dd>${p.god||'—'}</dd></div><div><dt>地支藏干</dt><dd>${p.hidden.map(h=>`${h.stem}<small>（${h.god}）</small>`).join('<br>')||'—'}</dd></div></dl></article>`).join('');
 const folk=r.lunarYear,life=ch.yearLife,day=ch.dayMaster;
 $('birth-summary').innerHTML=`<article><span>年命纳音 · 立春年柱</span><strong>${esc(life?life.name+'命':'年柱未定')}</strong><p>纳音五行：${life?.element||'未定'}</p>${folk?`<p class="birth-folk">农历岁首口径：${folk.gz} · ${esc(folk.nayin.name)}${folk.gz!==ch.pillars[0].gz?'（与年柱不同）':''}</p>`:''}</article><article><span>日主 · 日干五行</span><strong>${day.stem}${day.element} · ${day.yinYang}${day.element}</strong><p>${esc(day.stem)}日出生，以日干为日主。</p></article><article><span>命格参考 · 月令本气简法</span><strong>${esc(ch.pattern.title)}</strong><p>结合下方依据查看，非成格定论。</p></article>`;
 $('birth-elements').innerHTML=`<div class="birth-elements-heading"><h4>干支表层五行</h4><span class="hint">共${ch.elements.total}字；地支按本气计数，非旺衰评分</span></div><div class="birth-element-bars">${B.EL.map(e=>`<div class="birth-element-cell ${elemClass(e)}"><span>${e}</span><strong>${ch.elements.surface[e]}</strong><i style="--n:${ch.elements.surface[e]}"></i></div>`).join('')}</div><p class="hint">表层未见：${ch.elements.unseen.join('、')||'无'}。藏干涉及：${ch.elements.hidden.join('、')||'未定'}。未见不直接等于命理“缺某行”，也不据此自动补某行。</p>`;
 $('birth-pattern-evidence').innerHTML=`<p>${esc(ch.pattern.basis)}</p><p>月令藏干透出线索：${ch.pattern.candidates.length?ch.pattern.candidates.map(c=>`${c.stem}（${c.god}）见于${c.where.join('、')}`).map(esc).join('；'):'年、月及已知时干中未见月令藏干直接透出，不能据此判无格。'}</p>${ch.pattern.notes.map(n=>`<p>${esc(n)}</p>`).join('')}<p class="birth-rule-line">${esc(r.boundaryLabel)}；${r.termMode==='modern'?'以现代定气交节时刻换年/月':'以历书交节日期换年/月'}。</p>`;
 $('birth-copy-status').textContent='';
}
function reportText(){
 const r=state.result;if(!r)return '';let lines=['生日四柱与纳音',`公历：${r.date}；儒略历：${r.julian}`,`基准史历：${lunarText(r.lunar)}`,`输入资料：${r.source}`,`出生时间：${r.time.label}，UTC${r.offset>=0?'+':''}${r.offset}`,`换日：${r.boundaryLabel}`,`年/月柱：${r.termMode==='modern'?'现代定气交节时刻':'历书交节日期'}；年柱立春换年，月柱以十二节换月。`];
 if(r.lunarYear)lines.push(`农历岁首口径年命：${r.lunarYear.gz} · ${r.lunarYear.nayin.name}`);
 for(const [i,ch] of r.charts.entries()){
  lines.push('',`候选${i+1}：${times(ch,r)}`,`四柱：${ch.eightChars}`,...ch.pillars.map(p=>`${p.role}：${p.gz||'未定'}；纳音${p.nayin?p.nayin.name+'（'+p.nayin.element+'）':'未定'}；干支本气${p.gz?p.stem.element+'/'+p.branch.element:'未定'}；天干十神${p.god||'未定'}`),`日主：${ch.dayMaster.stem}${ch.dayMaster.element}（${ch.dayMaster.yinYang}）`,`年命纳音（立春年柱）：${ch.yearLife?.name||'未定'}`,`命格参考（月令本气简法）：${ch.pattern.title}`,ch.pattern.basis,...ch.pattern.notes,`藏干透出线索：${ch.pattern.candidates.map(x=>`${x.stem}（${x.god}）于${x.where.join('、')}`).join('；')||'未见/资料未定'}`,`干支表层五行：${B.EL.map(e=>e+ch.elements.surface[e]).join('、')}，共${ch.elements.total}字，非旺衰评分。`);
 }
 lines.push('',...r.notes,'格局只列月令本气及透干参考，不自动判成格、从格、喜用神或富贵吉凶。','纳音来源：《卜筮全书·六十甲子歌》 '+B.RULES.nayin);return lines.join('\n');
}
async function copy(){
 const text=reportText();if(!text)return;try{await navigator.clipboard.writeText(text);$('birth-copy-status').textContent='已复制完整排盘（含全部候选与口径说明）';}catch(_){const ta=document.createElement('textarea');ta.value=text;document.body.append(ta);ta.select();$('birth-copy-status').textContent=document.execCommand('copy')?'已复制完整排盘':'浏览器不允许复制，请直接选中文字复制';ta.remove();}
}
$('birth-form').addEventListener('submit',e=>{e.preventDefault();try{generate();}catch(x){$('birth-result').hidden=true;$('birth-date-choice-wrap').hidden=true;$('birth-welcome').hidden=false;state.result=null;error(x);}});
$('birth-form').addEventListener('input',dirty);$('birth-form').addEventListener('change',()=>{fields();dirty();});
$('birth-date-choice').addEventListener('change',()=>{if($('birth-date-choice').value===''){$('birth-result').hidden=true;state.result=null;}else try{selectDate(+$('birth-date-choice').value);}catch(x){error(x);}});
$('birth-copy').addEventListener('click',copy);
$('birth-use-date').addEventListener('click',()=>{
 const s=window.HistoryApp.state;dirty();$('birth-calendar').value='gregorian';$('birth-date').value=C.dateText(s.selected);$('birth-time').value='';
 if(s.minuteProvided&&s.minute!==null){$('birth-time-mode').value='exact';$('birth-time').value=clock(s.minute);}else if($('inspect-hour').value!==''){$('birth-time-mode').value='branch';$('birth-branch').value=C.ZHI[+$('inspect-hour').value];}else $('birth-time-mode').value='unknown';
 $('birth-boundary').value=$('boundary').value;fields();try{generate();}catch(x){error(x);}
});
document.querySelectorAll('[data-birth-example]').forEach(btn=>btn.addEventListener('click',()=>{dirty();$('birth-calendar').value='gregorian';$('birth-date').value=btn.dataset.birthExample==='classic'?'1380-12-31':'2024-02-04';$('birth-time-mode').value='unknown';$('birth-time').value='';$('birth-boundary').value='zi';$('birth-term-mode').value='modern';$('birth-offset').value='8';fields();try{generate();}catch(x){error(x);}}));
$('birth-branch').innerHTML=[...C.ZHI].map((z,b)=>`<option value="${z}">${z}时 · ${b===0?'00:00—01:00 / 23:00—24:00':clock(b*120-60)+'—'+clock(b*120+60)}</option>`).join('');
$('birth-polity').innerHTML+=cal.polities.filter(p=>cal.records.some(r=>r.polity===p&&r.system==='当地史历'&&r.months.length)).map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
$('birth-nayin-table').innerHTML=B.NAMES.map((name,i)=>`<tr><td>${C.CYCLE[i*2]}、${C.CYCLE[i*2+1]}</td><td>${name}</td><td>${name.at(-1)}</td></tr>`).join('');
fields();window.BirthApp={calendar:birth,state,generate,selectDate,reportText};
})();
