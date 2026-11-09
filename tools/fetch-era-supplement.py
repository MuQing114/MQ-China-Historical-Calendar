"""Save the publicly readable era-list page as a factual year-level supplement."""
from pathlib import Path
import urllib.request
import urllib.parse
import hashlib
import json

ROOT=Path(__file__).resolve().parents[1]
dest=ROOT/'sources'/'era-year-supplement'
dest.mkdir(parents=True,exist_ok=True)
url='https://zh.wikipedia.org/wiki/'+urllib.parse.quote('中国年号列表')
req=urllib.request.Request(url,headers={'User-Agent':'ChinaHistoryCalendarResearch/2.0 (offline chronology data compilation)'})
b=urllib.request.urlopen(req,timeout=45).read()
(dest/'中国年号列表.html').write_bytes(b)
(dest/'provenance.json').write_text(json.dumps({'url':url,'retrieved':'2026-11-09','license':'CC BY-SA 4.0; factual era names and year spans extracted, prose not reproduced','sha256':hashlib.sha256(b).hexdigest()},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'bytes':len(b),'file':str(dest/'中国年号列表.html')},ensure_ascii=False))
