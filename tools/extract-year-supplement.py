"""Extract factual names/year spans from the saved open-licence era-list tables.

Do not infer month/day boundaries. Unknown dates remain unknown. Original HTML
and attribution accompany this CC BY-SA 4.0 data subset.
"""
from html.parser import HTMLParser
from pathlib import Path
import re
import json

ROOT=Path(__file__).resolve().parents[1]

class Tables(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.heads={};self.heading=None;self.ht=[];self.depth=0;self.active=None;self.rows=[];self.row=None;self.cell=None;self.sup=0;self.tables=[];self.caption='';self.in_caption=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if re.fullmatch('h[2-4]',tag):self.heading=int(tag[1]);self.ht=[]
        if tag=='table':
            self.depth+=1
            if self.active is None and 'wikitable' in a.get('class',''):
                self.active=self.depth;self.rows=[];self.context=' / '.join(self.heads[k] for k in sorted(self.heads));self.caption=''
        if tag=='caption' and self.active is not None:self.in_caption=True
        if self.active is not None and self.depth==self.active:
            if tag=='tr':self.row=[]
            elif tag in ('td','th'):
                self.cell={'text':[],'rowspan':int(a.get('rowspan','1')),'colspan':int(a.get('colspan','1')),'header':tag=='th'}
        if tag=='sup':self.sup+=1
        if tag=='br' and self.cell is not None:self.cell['text'].append(' ')
    def handle_data(self,data):
        if self.heading is not None:self.ht.append(data)
        if self.in_caption and not self.sup:self.caption+=data
        if self.cell is not None and not self.sup:self.cell['text'].append(data)
    def handle_endtag(self,tag):
        if tag=='sup':self.sup=max(0,self.sup-1)
        if tag=='caption':self.in_caption=False
        if re.fullmatch('h[2-4]',tag) and self.heading is not None:
            h=self.heading;self.heads={k:v for k,v in self.heads.items() if k<h};self.heads[h]=''.join(self.ht).replace('[编辑]','').strip();self.heading=None
        if tag in ('td','th') and self.cell is not None:
            self.cell['text']=re.sub(r'\s+',' ',''.join(self.cell['text'])).strip()
            if self.row is not None:self.row.append(self.cell)
            self.cell=None
        if tag=='tr' and self.row is not None:
            self.rows.append(self.row);self.row=None
        if tag=='table':
            if self.active==self.depth:
                self.tables.append((self.context,self.rows,self.caption.strip()));self.active=None
            self.depth-=1

def years(text):
    vals=[]
    for m in re.finditer(r'(前\s*)?(\d{1,4})\s*年',text):
        n=int(m.group(2));vals.append(1-n if m.group(1) else n)
    return vals

p=Tables();p.feed((ROOT/'sources/era-year-supplement/中国年号列表.html').read_text(encoding='utf-8'))
out=[]
for context,rows,caption in p.tables:
    polity=re.sub(r'年[号號].*','',caption).replace('续','').replace('續','').strip() or (context.split(' / ')[-1] if context else '')
    local=bool(re.search(r'其他|割据|割據|起义|起義',caption))
    ruler='';rulerYears=[];columns=[];spans={}
    for raw in rows:
        if not raw:continue
        texts=[c['text'] for c in raw]
        if len(raw)==1:
            text=texts[0]
            if '在位' in text:ruler=text.split('（')[0].strip();rulerYears=years(text)
            elif ('年号' in text or '年號' in text) and len(text)>3:
                polity=re.sub(r'年[号號].*','',text).strip()
            continue
        if texts[0] in ['年号','年號']:
            columns=texts;spans={};continue
        # Apply rowspans so all repeated rulers and date cells retain their values.
        vals=[];idx=0
        for cell in raw:
            while idx in spans:
                t,n=spans[idx];vals.append(t)
                if n==1:del spans[idx]
                else:spans[idx]=(t,n-1)
                idx+=1
            vals.append(cell['text'])
            if cell['rowspan']>1:spans[idx]=(cell['text'],cell['rowspan']-1)
            idx+=1
        if len(vals)<2:continue
        name,when=vals[0],vals[1]
        if not name or name in ['不詳','不详','無年號','无年号'] or len(name)>24:continue
        yy=years(when)
        if not yy and '？' not in when and '?' not in when:continue
        ownRuler=ruler
        for col in ['君主','使用者']:
            if col in columns and columns.index(col)<len(vals):ownRuler=vals[columns.index(col)]
        if not polity or not name:continue
        possible=('？' in when or '?' in when or not yy)
        s=min(yy) if yy else min(rulerYears) if rulerYears else None
        e=max(yy) if len(yy)>1 else (max(rulerYears) if possible and rulerYears else s)
        if s is not None and e is not None and e<s:s,e=e,s
        note=vals[-1] if len(vals)>3 else ''
        state=('地方势力·'+(ownRuler or name)) if local else polity
        if state=='宋' and s is not None and s<600:state='刘宋'
        if state=='齊' and s is not None and s<600:state='南齐'
        if state=='夏' and s is not None and 300<s<500:state='胡夏'
        dubious=bool(re.search(r'疑|讹|訛|無此|无此|误|誤|无据|無據|未詳|不详',note))
        out.append({'id':'Y'+str(len(out)),'polity':state,'era':name,'monarch':ownRuler,'sy':s,'ey':e,'precision':'年','uncertain':possible or dubious,'unknownSpan':possible,'displaySpan':when,'source':'年号列表年度补充','url':'https://zh.wikipedia.org/wiki/中国年号列表','context':context+' / '+caption,'note':note})

(ROOT/'dist/year-supplement.js').write_text('/* Factual era names and year spans; Wikipedia contributors, CC BY-SA 4.0. */\nwindow.YEAR_SUPPLEMENT='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(ROOT/'sources/era-year-supplement/extraction-report.json').write_text(json.dumps({'tables':len(p.tables),'records':len(out),'polities':sorted(set(x['polity'] for x in out)),'undated':sum(x['sy'] is None for x in out),'source':'CC BY-SA 4.0, original HTML saved'},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'tables':len(p.tables),'records':len(out),'undated':sum(x['sy'] is None for x in out),'southwest':[x for x in out if x['polity'] in ['南詔','南诏','大理']][:6]},ensure_ascii=False))
