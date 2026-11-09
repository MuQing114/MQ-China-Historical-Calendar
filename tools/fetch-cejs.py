"""Fetch a pinned, BSD-licensed subset of CeJS for offline data compilation."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'sources'/'CeJS'
SHA='0e10a9dffc1315c29f4e0868366bc0580a072c44'
BASE='https://raw.githubusercontent.com/kanasimi/CeJS/'+SHA+'/'
FILES=['LICENSE','package.json','README.md','ce.js','_structure/base.js','_structure/module.js','_structure/dependency_chain.js','_structure/initialization.js','_structure/compatibility.js','_for include/node.loader.js','data/date.js','data/native.js','data/code.js','data/code/compatibility.js','data/numeral.js','data/math.js','data/math/integer.js','data/date/calendar.js','data/date/era.js','data/date/era_data.js','application/locale.js','application/debug.js','interact/console.js']

def one(name):
    p=DEST/name
    if p.exists(): return {'path':name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
    u=BASE+urllib.parse.quote(name)
    try:
        req=urllib.request.Request(u,headers={'User-Agent':'ChinaHistoryCalendarResearch/2.0'})
        b=urllib.request.urlopen(req,timeout=40).read()
    except Exception as e: return {'path':name,'error':str(e)}
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_bytes(b)
    return {'path':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}

if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex: result=list(ex.map(one,FILES))
    (DEST/'provenance.json').write_text(json.dumps({'repository':'https://github.com/kanasimi/CeJS','commit':SHA,'license':'BSD-3-Clause','files':result},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))
