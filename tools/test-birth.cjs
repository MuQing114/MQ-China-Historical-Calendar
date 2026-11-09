/* Birth-chart regression checks; independent fixtures and critical boundaries. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
for(const f of ['calendar-data','era-data','year-supplement','history-core','birth-core'])vm.runInThisContext(fs.readFileSync(path.join(root,'dist',f+'.js'),'utf8').replace('window.','globalThis.'));
const C=HistoryCalendar,B=BirthCalendar,c=C.make(HISTORY_DATA,ERA_DATA,YEAR_SUPPLEMENT),b=B.make(c);let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
const j=date=>{const a=date.split('-').map(Number);return C.toJdn(...a);};
const at=(date,time,extra={})=>b.build({j:j(date),time,...extra});
const fixed=JSON.parse(fs.readFileSync(path.join(root,'sources/birth-rules/独立验证样例.json'),'utf8'));
test('independent official EightChar fixtures across centuries and Zi conventions',()=>{for(const x of fixed.cases){const r=at(x.date,x.time,{boundary:x.boundary});assert.equal(r.charts.length,1,x.date);assert.equal(r.charts[0].eightChars,x.expected,x.date+' '+x.time);}});
test('NaYin table has all sixty combinations and preserves quoted book names',()=>{
 assert.equal(B.NAMES.length,30);for(const gz of C.CYCLE){const n=B.naYin(gz);assert.ok(n);assert.ok(B.EL.includes(n.element));}
 for(const [gz,name] of [['庚申','石榴木'],['戊子','霹雳火'],['癸丑','桑柘木'],['庚午','路傍土'],['甲申','井泉水'],['甲午','砂中金'],['甲辰','覆灯火']])assert.equal(B.naYin(gz).name,name);
 assert.equal(B.naYin('甲丑'),null);
});
test('user example retains three known pillars and never fabricates an hour',()=>{
 const r=at('1380-12-31','',{boundary:'midnight'}),q=r.charts[0];assert.equal(r.charts.length,1);assert.equal(q.eightChars,'庚申 戊子 癸丑 未定');assert.equal(q.dayMaster.element,'水');assert.equal(q.yearLife.name,'石榴木');assert.equal(q.pillars[3].nayin,null);assert.equal(q.elements.total,6);assert.equal(q.pattern.title,'建禄格');
});
test('all four NaYin and stem relations match an independent birthday',()=>{
 const q=at('2005-12-23','08:37').charts[0];assert.deepEqual(q.pillars.map(p=>p.nayin.name),['井泉水','霹雳火','白蜡金','长流水']);assert.deepEqual(q.pillars.map(p=>p.god),['偏财','正印','日主','伤官']);assert.deepEqual(q.elements.surface,{木:1,火:1,土:2,金:2,水:2});
 assert.equal(q.pattern.title,'食神格','month stem is not mistaken for monthly main qi');
});
test('LiChun changes year/month at HKO 2024-02-04 16:27, not lunar New Year',()=>{
 const a=at('2024-02-04','16:26').charts[0],after=at('2024-02-04','16:27'),z=after.charts[0];assert.equal(a.pillars[0].gz,'癸卯');assert.equal(a.pillars[1].gz,'乙丑');assert.equal(z.pillars[0].gz,'甲辰');assert.equal(z.pillars[1].gz,'丙寅');assert.equal(after.lunarYear.gz,'癸卯');assert.equal(z.yearLife.name,'覆灯火');assert.equal(after.lunarYear.nayin.name,'金箔金');assert.ok(after.notes.some(n=>n.includes('农历岁首年')));
});
test('unknown birth time preserves crossing candidates without twelve-noon assumptions',()=>{
 const r=at('2024-02-04','',{boundary:'zi'});assert.equal(r.charts.length,3);assert.ok(r.charts.every(q=>q.pillars[3].gz===null));assert.deepEqual(r.charts[0].windows,[[0,987]]);assert.deepEqual(r.charts[1].windows,[[987,1380]]);assert.deepEqual(r.charts[2].windows,[[1380,1440]]);
});
test('three late-Zi rules differ as declared and start precisely at 23:00',()=>{
 const m=at('1988-02-15','23:30',{boundary:'midnight'}).charts[0],z=at('1988-02-15','23:30',{boundary:'zi'}).charts[0],s=at('1988-02-15','23:30',{boundary:'split'}).charts[0];assert.equal(m.pillars[2].gz,'庚子');assert.equal(m.pillars[3].gz,'丙子');assert.equal(z.pillars[2].gz,'辛丑');assert.equal(z.pillars[3].gz,'戊子');assert.equal(s.pillars[2].gz,'庚子');assert.equal(s.pillars[3].gz,'戊子');assert.equal(at('1988-02-15','22:59',{boundary:'zi'}).charts[0].pillars[2].gz,'庚子');assert.equal(at('1988-02-15','23:00',{boundary:'zi'}).charts[0].pillars[2].gz,'辛丑');
});
test('only a branch is known: early/late Zi remain separate when necessary',()=>{
 const r=b.build({j:j('1988-02-15'),timeMode:'branch',branch:'子',boundary:'zi'});assert.equal(r.charts.length,2);assert.deepEqual(r.charts[0].windows,[[0,60]]);assert.deepEqual(r.charts[1].windows,[[1380,1440]]);
 const m=b.build({j:j('1988-02-15'),timeMode:'branch',branch:'子',boundary:'midnight'});assert.equal(m.charts.length,1);assert.equal(m.charts[0].windows.length,2);
});
test('fixed UTC offset changes the solar-term clock, not the input local date',()=>{
 const a=at('2024-02-04','08:26',{offset:0}),z=at('2024-02-04','08:27',{offset:0});assert.equal(a.charts[0].pillars[0].gz,'癸卯');assert.equal(z.charts[0].pillars[0].gz,'甲辰');assert.equal(a.charts[0].pillars[2].gz,z.charts[0].pillars[2].gz);assert.throws(()=>at('2000-01-01','12:00',{offset:8.1}),/UTC时差/);
});
test('lunar birthday equals the same solar birthday, including an independent lunar fixture',()=>{
 const ds=b.resolve({calendar:'lunar',year:'2019',month:'十二',day:'十二'});assert.equal(ds.length,1);assert.equal(C.dateText(ds[0].j),'2020-01-06');assert.equal(b.build({...ds[0],time:'11:22'}).charts[0].eightChars,'己亥 丁丑 戊申 戊午');
 const h=b.resolve({calendar:'lunar',year:'洪武十三',month:'十一',day:'廿七'});assert.equal(C.dateText(h[0].j),'1380-12-31');
});
test('leap months resolve correctly but do not define the BaZi month pillar',()=>{
 const a=b.resolve({calendar:'lunar',year:'2023',month:'二',day:'初一'}),z=b.resolve({calendar:'lunar',year:'2023',month:'闰二',day:'初一'}),v=b.resolve({calendar:'lunar',year:'2023',month:'闰二',day:'二十'});assert.equal(C.dateText(a[0].j),'2023-02-20');assert.equal(C.dateText(z[0].j),'2023-03-22');assert.equal(b.build({...z[0],time:'12:00'}).charts[0].pillars[1].gz,'乙卯');assert.equal(b.build({...v[0],time:'12:00'}).charts[0].pillars[1].gz,'丙辰');assert.throws(()=>b.resolve({calendar:'lunar',year:'2023',month:'闰二',day:'三十'}),/没有对应/);
});
test('same-name era ambiguity is retained rather than selecting the first birthday',()=>{
 const rs=b.resolve({calendar:'lunar',year:'建兴三',month:'正',day:'初一'});assert.ok(rs.length>1);assert.equal(new Set(rs.map(x=>x.j)).size,rs.length);
});
test('unsupported early lunar, coarse eras, civil-era misuse and bad dates do not fake a chart',()=>{
 assert.throws(()=>b.resolve({calendar:'lunar',year:'大理天开三',month:'二',day:'初一'}),/只有年度资料/);assert.throws(()=>b.resolve({calendar:'lunar',year:'前2000',month:'正',day:'初一'}),/只有年度资料/);assert.throws(()=>b.resolve({calendar:'lunar',year:'民国115',month:'十一',day:'初九'}),/不能冒充农历/);assert.throws(()=>b.resolve({date:'0-01-01'}));assert.throws(()=>b.resolve({date:'2025-02-29'}));assert.throws(()=>b.resolve({date:'2026-11-10'}),/超出/);assert.throws(()=>at('2000-01-01','24:00'),/时分/);
});
test('pre-calendar solar inputs retain only computable day/hour, not invented year/month',()=>{
 const ds=b.resolve({date:'前2000-05-01'}),r=b.build({...ds[0],time:'12:00'});assert.equal(r.charts[0].pillars[0].gz,null);assert.equal(r.charts[0].pillars[1].gz,null);assert.equal(r.charts[0].yearLife,null);assert.equal(r.charts[0].pattern.title,'资料不足，不能取格');assert.ok(r.notes.some(n=>n.includes('数学回推')));
});
test('pattern rules disclose the base qi, exposed-stem clues and mixed-qi limit',()=>{
 const p=['甲子','丁卯','甲辰','甲子'].map((g,i)=>B.pillar(g,['年柱','月柱','日柱','时柱'][i],'甲'));assert.equal(B.pattern(p).title,'阳刃格');const q=['甲子','戊辰','戊申','癸丑'].map((g,i)=>B.pillar(g,['年柱','月柱','日柱','时柱'][i],'戊'));assert.equal(B.pattern(q).title,'比肩当令（取格待核）');assert.ok(B.pattern(q).notes.some(n=>n.includes('杂气')));assert.ok(B.pattern(q).candidates.some(x=>x.stem==='戊'&&x.where.includes('月柱')));
});
console.log(JSON.stringify({checks,independentPillarFixtures:fixed.cases.length,nayinPairs:B.NAMES.length,version:'2.1.0'}));
