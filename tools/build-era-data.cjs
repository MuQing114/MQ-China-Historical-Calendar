/* Offline data compiler. CeJS source/data: kanasimi, BSD-3-Clause.
 * 2026-11-09: China-only catalogue, local calendar slices and precision flags.
 */
process.env.TZ='Etc/UTC';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const os=require('node:os');os.userInfo=()=>({username:'calendar-compiler',homedir:__dirname,shell:null,uid:0,gid:0});
require('../sources/CeJS/_for include/node.loader.js');
CeL.set_debug(0);
const issues=[];CeL.error=msg=>issues.push(String(msg).replace(/\x1b\[[\d;]*m/g,''));CeL.warn=CeL.error;
const charMap={};
fs.readFileSync(path.join(root,'sources/OpenCC/TSCharacters.txt'),'utf8').split(/\r?\n/).forEach(l=>{if(!l||l.startsWith('#'))return;const [a,b]=l.split('\t');if(b)charMap[a]=b.split(' ')[0];});
const simp=s=>Array.from(String(s??'')).map(c=>charMap[c]||c).join('');
// Proper era names keep 乾 (乾隆、乾元、乾道); character-only 干 is unsuitable.
charMap['乾']='乾';
const dayMs=86400000;
const jdn=date=>Math.round(Number(date)/dayMs+2440588);
function cleanNote(n){return Array.isArray(n)?n.map(String).join('；'):String(n||'');}
function compile(){
  const sourceList=Array.from(CeL.era('中國',{get_era_list:true}));
  const records=[],skipped=[];
  for(let i=0;i<sourceList.length;i++){
    const e=sourceList[i],names=e.name||[],era=simp(names[0]),monarch=simp(names[1]),polity=simp(names[2]);
    // Technical reference calendars and modern personal tenures are not era names.
    if(['中曆','中历','秦漢歷','秦汉历','魯春秋','鲁春秋'].includes(polity)||['中曆','中历'].includes(era)||e.參照用){skipped.push({name:names,reason:'technical reference calendar'});continue;}
    if(['中華民國','中华民国','中华人民共和国'].includes(polity)){skipped.push({name:names,reason:'modern personal tenure; modern numbering supplied separately'});continue;}
    const s=Math.round(e.start_JDN),end=Math.round(e.end_JDN);
    if(!Number.isFinite(s)||!Number.isFinite(end)||s>=end){skipped.push({name:names,reason:'invalid source interval'});continue;}
    const record={id:'C'+i,polity,era,monarch,original:names.slice(0,3),s,e:end,precision:e.精||'日',doubt:!!e.疑,accuracy:typeof e.準==='string'?e.準:(e.準?'来源精度不足':''),aliases:[],kind:era===monarch?'君主纪年':'年号',source:'CeJS',note:simp(cleanNote(e.注)),basis:simp(cleanNote(e.據)),calendarName:simp(cleanNote(e.曆法)),system:String(e.calendar)===':CE'||e.參照曆法==='CE'?'公历':e.曆法==='太平天曆'?'太平天历':'当地史历',months:[]};
    for(const key of ['朝代','政權','國號','紀年','君主','君主名','年號']){
      const vals=Array.isArray(e[key])?e[key]:String(e[key]||'').split(';');
      record.aliases.push(...vals.filter(Boolean).map(simp));
    }
    record.aliases=[...new Set(record.aliases)];
    try{
        e.initialize();
        if(!Array.isArray(e.calendar)||!Array.isArray(e.year_start))throw Error('calendar unavailable');
        const cycle0=e.get_year_stem_branch_index();
        const month0=e.get_month_branch_index();
        record.yearAnchor=e.起始年序;
        if(e.精!=='年'){
        const initial=e.calendar[0],firstEnd=e.year_start[1]?jdn(e.year_start[1]):end;
        const firstCount=initial.reduce((n,_,mi)=>n+(jdn(e.date_index_to_Date(0,mi,0))<firstEnd&&mi!==initial.leap?1:0),0);
        let clipped=false;
        for(let yi=0;yi<e.calendar.length;yi++){
          const year=e.calendar[yi];if(!Array.isArray(year))continue;
          const ys=jdn(e.year_start[yi]),ye=e.year_start[yi+1]?jdn(e.year_start[yi+1]):end;
          for(let mi=0;mi<year.length;mi++){
            const raw=e.date_index_to_Date(yi,mi,0),a=jdn(raw),b=a+Number(year[mi]);
            const nm=e.日名(0,mi,yi),offset=Number(nm[0])-1,month=simp(nm[1]);
            if(!Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(offset)||b<=a)continue;
            if(a>=end||b<=s||a>=ye||b<=ys)continue;
            // [slice start, slice end exclusive, regnal year, month name, day offset]
            const monthCycle=((month0+(yi?firstCount+12*(yi-1):0)+mi-(Number.isInteger(year.leap)&&mi>=year.leap?1:0))%60+60)%60;
            if(b>ye&&ye<end)clipped=true;
            record.months.push([Math.max(s,a,ys),Math.min(end,b,ye),String(nm[2]),String(month),offset+Math.max(0,s-a,ys-a),(cycle0+yi)%60,record.yearAnchor+yi,monthCycle]);
          }
        }
        record.months.sort((a,b)=>a[0]-b[0]);
        if(clipped){record.calendarIssue='来源月表跨越其岁界，按来源岁界截为历法片段；不将重叠片段作唯一确定历日。';record.doubt=true;}
        if(record.months.some(m=>/^\d+$/.test(m[3])&&Number(m[3])>12)){record.calendarIssue=(record.calendarIssue||'')+'来源含非常规月名（13月等），保留原标记，未擅改为普通闰月。';record.doubt=true;}
        }
      }catch(err){record.calendarIssue=String(err.message||err);}
    if(Array.isArray(e.year_start))record.yearPoints=e.year_start.map((d,i)=>[jdn(d),String(e.歲名(i))]).filter(p=>p[0]<end);
    if(!record.months.length&&record.precision==='日')record.precision='年';
    records.push(record);
  }
  const out={source:{repository:'https://github.com/kanasimi/CeJS',commit:'0e10a9dffc1315c29f4e0868366bc0580a072c44',license:'BSD-3-Clause'},records,charMap};
  fs.writeFileSync(path.join(root,'dist/era-data.js'),'/* CeJS/kanasimi, BSD-3-Clause. See offline sources and licenses. */\nwindow.ERA_DATA='+JSON.stringify(out)+';\n');
  fs.writeFileSync(path.join(root,'sources/era-compilation-report.json'),JSON.stringify({input:sourceList.length,records:records.length,polities:[...new Set(records.map(e=>e.polity))],monthSlices:records.reduce((n,e)=>n+e.months.length,0),withoutCalendar:records.filter(e=>!e.months.length).map(e=>({id:e.id,polity:e.polity,era:e.era,precision:e.precision})),calendarAdjustments:records.filter(e=>e.calendarIssue).map(e=>({id:e.id,polity:e.polity,era:e.era,note:e.calendarIssue})),skipped,issues:[...new Set(issues)].slice(0,100)},null,2));
  console.log(JSON.stringify({records:records.length,polities:new Set(records.map(e=>e.polity)).size,monthSlices:records.reduce((n,e)=>n+e.months.length,0),bytes:fs.statSync(path.join(root,'dist/era-data.js')).size,issues:issues.length}));
}
CeL.env.era_data_load=(country,queue)=>{if(typeof country==='object')queue.splice(0,queue.length,'中國');if(!queue)compile();};
CeL.run('data.date.era');
