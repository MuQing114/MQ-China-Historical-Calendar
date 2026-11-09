/* Meaningful offline regression tests. Run node tools/test-calendar.cjs. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
for(const f of ['calendar-data','era-data','year-supplement','history-core'])vm.runInThisContext(fs.readFileSync(path.join(root,'dist',f+'.js'),'utf8').replace('window.','globalThis.'));
const C=HistoryCalendar,c=C.make(HISTORY_DATA,ERA_DATA,YEAR_SUPPLEMENT);let checks=0;
const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
test('BCE/CE and both civil calendars round-trip across full supported range',()=>{
 const first=C.toJdn(HISTORY_DATA.minYear,1,1),last=C.toJdn(2027,1,1);
 for(let j=first;j<last;j++)for(const kind of ['gregorian','julian']){const p=C.fromJdn(j,kind);assert.equal(C.toJdn(p.y,p.m,p.d,kind),j);}
 assert.equal(C.dateText(C.toJdn(0,12,31)+1),'1-01-01');assert.throws(()=>c.civilYear('0'));assert.equal(c.civilYear('前1'),0);
 assert.throws(()=>C.toJdn(1500,2,29));assert.ok(C.toJdn(1500,2,29,'julian'));
 assert.equal(C.dateText(C.toJdn(1582,10,4)+1),'1582-10-05');
});
test('main lunar table continuous; month day numbers valid',()=>{
 const ms=HISTORY_DATA.mainMonths;for(let i=0;i<ms.length;i++){const m=ms[i];assert.ok(m[4]>m[3]);assert.ok(m[8]>=0);assert.ok(m[8]+m[4]-m[3]<=30);if(i)assert.equal(ms[i-1][4],m[3]);assert.equal(c.mainAt(m[3]).d,m[8]+1);assert.equal(c.mainAt(m[4]-1).d,m[8]+m[4]-m[3]);}
 assert.ok(c.mainAt(C.toJdn(2026,11,9)));assert.equal(c.mainAt(C.toJdn(-2000,1,1)),null);
});
test('Ming five Wu-Shen years preserved',()=>assert.deepEqual(c.query({year:'戊申',min:'1368',max:'1644'}).years,[1368,1428,1488,1548,1608]));
test('Hongwu 18 / lunar 2-27 and GanZhi round trip',()=>{
 const r=c.query({year:'洪武十八',month:'二',day:'廿七'});assert.equal(r.rows.length,1);const j=r.rows[0].j;assert.equal(C.dateText(j),'1385-04-15');assert.equal(C.dateText(j,'julian'),'1385-04-07');assert.equal(C.dayGZ(j),'己未');
 const m=c.mainAt(j);assert.equal(m.y,1385);assert.equal(m.m,2);assert.equal(m.d,27);
});
test('four GanZhi components yield correct day and two-hour interval',()=>{
 const r=c.query({year:'戊申',month:'甲寅',day:'甲子',hour:'丙寅',min:'1368',max:'1644'});assert.equal(r.rows.length,1);assert.equal(C.dateText(r.rows[0].j),'1488-02-20');assert.equal(Math.round((r.rows[0].windows[0].s-r.rows[0].j)*1440),180);assert.equal(Math.round((r.rows[0].windows[0].e-r.rows[0].j)*1440),300);
});
test('first Hongwu and Chongzhen fall dates',()=>{
 const a=c.query({year:'洪武元',month:'正',day:'乙亥'});assert.equal(C.dateText(a.rows[0].j),'1368-01-31');
 const b=c.query({year:'崇祯十七',month:'三',day:'丁未'});assert.equal(C.dateText(b.rows[0].j),'1644-04-25');
});
test('Three Kingdoms simultaneous local calendars, not a single dynastic label',()=>{
 const j=C.toJdn(225,6,1),es=c.allEras(j);for(const n of ['魏','蜀','吴'])assert.ok(es.some(e=>e.record.polity===n&&!e.coarse&&e.local));
 const names=es.map(e=>e.record.era);for(const n of ['黄初','建兴','黄武'])assert.ok(names.includes(n));
 let different=false;for(let d=j;d<j+366;d++){const ls=c.allEras(d).filter(e=>['魏','蜀','吴'].includes(e.record.polity)).map(e=>e.local?.label+'/'+e.local?.d);if(new Set(ls).size>1){different=true;break;}}assert.ok(different,'independent calendars retain disagreements');
});
test('Song Jin Xia Xiliao Dali all retained, annual sources separate',()=>{
 const es=c.allEras(C.toJdn(1160,6,1));for(const n of ['南宋','金','西夏','西辽'])assert.ok(es.some(e=>e.record.polity===n));assert.ok(es.some(e=>e.record.polity.includes('大理')&&e.coarse));
 const r=c.query({year:'大理天开三',month:'二',day:'初一'});assert.equal(r.rows.length,1);assert.equal(r.rows[0].kind,'coarse');assert.equal(r.rows[0].y,1207);
});
test('Southern Ming, Qing, Zheng and doubtful claims survive',()=>{
 const es=c.allEras(C.toJdn(1663,6,1));for(const n of ['清','明郑','南明'])assert.ok(es.some(e=>e.record.polity===n));assert.ok(es.some(e=>e.record.era==='定武'&&e.record.doubt));
 const whole=c.allEras(C.toJdn(1644,1,1),C.toJdn(1645,1,1),'year');for(const n of ['崇祯','顺治'])assert.ok(whole.some(e=>e.record.era===n));assert.ok(whole.some(e=>e.record.polity==='南明'));assert.ok(!whole.some(e=>e.record.era==='弘光'&&!e.coarse),'Hongguang era starts in the following lunar year');
});
test('Xia/Shang years remain coarse; no invented lunar dates',()=>{
 const r=c.query({year:'前2000',month:'正',day:'初一'});assert.equal(r.rows.length,1);assert.equal(r.rows[0].kind,'coarse');assert.equal(c.describe(C.toJdn(-1999,5,1)).lunar,null);assert.ok(c.allEras(C.toJdn(-1999,5,1)).some(e=>e.record.polity==='夏'&&e.coarse));
 const x=c.query({year:'周宣王三'});assert.ok(x.rows.length);assert.ok(x.rows.every(e=>e.kind==='coarse'));
});
test('modern civil and Minguo numbering, no personal ruler eras',()=>{
 const j=C.toJdn(2026,11,9),es=c.allEras(j);assert.equal(es.find(e=>e.record.id==='modern-roc').year,'115');assert.equal(es.find(e=>e.record.id==='modern-prc').year,'2026');
 const r=c.query({year:'民国一百一十五',month:'十一',day:'初九'});assert.equal(r.rows.length,1);assert.equal(C.dateText(r.rows[0].j),'2026-11-09');assert.ok(!c.allEras(C.toJdn(1949,9,1)).some(e=>e.record.id==='modern-prc'));
});
test('Zi boundary splits late Zi and uses next day GanZhi',()=>{
 const j=C.toJdn(1488,2,20),dg=C.dayGZ(j+1),hg=C.hourGZ(j+1,0),r=c.query({year:'1488',month:'正',day:dg,hour:hg,boundary:'zi'}),row=r.rows.find(e=>e.j===j);assert.ok(row);assert.ok(row.windows.some(w=>Math.round((w.s-j)*1440)===1380&&w.effective===j+1));
});
test('calendar reforms preserved; no modern month-renaming flattening',()=>{
 const wu=c.yearMap.get(690);assert.ok(wu.some(m=>m[2]==='正'));assert.ok(wu.some(m=>m[2]==='一'));
 const labels=c.yearMap.get(700).map(m=>m[2]);assert.ok(new Set(labels).size<labels.length||labels.some(s=>s.startsWith('闰'))||labels.includes('一'));
 const q=c.mainMonths.filter(m=>m[7].includes('秦汉'));assert.ok(q.some(m=>m[2]==='后九'));
});
test('all indexed calendars retain ordered non-overlapping month slices',()=>{
 for(const r of c.records){for(let i=0;i<r.months.length;i++){const m=r.months[i];assert.ok(m[1]>m[0],r.id);assert.ok(m[4]>=0,r.id);assert.ok(m[5]>=0&&m[5]<60,r.id);if(i)assert.ok(r.months[i-1][1]<=m[0],r.id);}}
});
test('fictitious source entries never attach automatically to dates',()=>{
 const rs=c.records.filter(r=>r.rejected&&r.s!==null);assert.ok(rs.length);for(const r of rs)assert.ok(!c.allEras(r.s+100).some(x=>x.record.id===r.id));
});
test('official and modern solar terms finite and chronologically ordered',()=>{
 for(const k of ['official','modern']){const a=c.terms[k];for(let i=0;i<a.length;i++){assert.ok(Number.isFinite(a[i][0]));if(i)assert.ok(a[i][0]>=a[i-1][0]);}}
 for(const y of [1734,1800,2000,2026]){const a=c.terms.official.filter(t=>t[2]===y);assert.equal(a.length,24);}
});
test('public result dates stop at this edition date, not guard-year ephemeris',()=>{
 assert.equal(c.domainEnd,C.toJdn(2026,11,10));
 assert.ok(c.query({year:'2026',month:'十',day:'初一'}).rows.some(r=>C.dateText(r.j)==='2026-11-09'));
 assert.equal(c.query({year:'2026',month:'十二',day:'初一'}).rows.length,0);
 assert.equal(c.query({year:'民国115',month:'十二',day:'初一'}).rows.length,0);
 assert.equal(c.allEras(C.toJdn(2026,12,1)).length,0);
 assert.ok(c.query({year:'2026'}).rows.every(r=>r.e<=c.domainEnd));
});
test('unbounded hour-only searches fail clearly instead of allocating millions of rows',()=>{
 assert.throws(()=>c.query({hour:'子'}),/范围过宽/);
});
console.log(JSON.stringify({checks,mainMonthSlices:HISTORY_DATA.mainMonths.length,eraRecords:c.records.length,polityLabels:c.polities.length,source:'offline pinned tables'}));
