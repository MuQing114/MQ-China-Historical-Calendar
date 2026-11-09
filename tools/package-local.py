"""Build the self-contained offline page and a reproducible source archive."""
from pathlib import Path
import hashlib
import html
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
page = (DIST / 'index.html').read_text(encoding='utf-8')
license_items = [
    ('署名、修改与资料许可说明', ROOT / 'NOTICE.md'),
    ('GNU GPL v3 许可证全文', ROOT / 'LICENSE'),
    ('CeJS · BSD-3-Clause 许可证全文', ROOT / 'sources/CeJS/LICENSE'),
    ('OpenCC · Apache-2.0 许可证全文', ROOT / 'sources/OpenCC/LICENSE'),
]
blocks = '\n'.join('<details class="source-details"><summary>'+html.escape(title)+'（离线）</summary><pre>'+html.escape(p.read_text(encoding='utf-8'))+'</pre></details>' for title, p in license_items)
page = page.replace('<div id="licenses"></div>', '<div id="licenses">'+blocks+'</div>')
css = (DIST / 'styles.css').read_text(encoding='utf-8')
offline = page.replace('<link rel="stylesheet" href="styles.css">', '<style>\n'+css+'\n</style>')
scripts = []
for name in ('calendar-data.js', 'era-data.js', 'year-supplement.js', 'history-core.js', 'app.js', 'birth-core.js', 'birth-ui.js'):
    source = (DIST / name).read_text(encoding='utf-8')
    safe = re.sub(r'</script', r'<\\/script', source, flags=re.I)
    tag = '<script src="'+name+'" defer></script>'
    assert tag in offline, name
    offline = offline.replace(tag, '')
    scripts.append('<script>\n'+safe+'\n</script>')
offline = offline.replace('</body>', '\n'.join(scripts)+'\n</body>')
out = DIST / 'MQ中国历史历日检索_夏至今_离线版.html'
out.write_text(offline, encoding='utf-8')
assert not re.search(r'<script[^>]+src=|<link[^>]+stylesheet', offline)
assert len(re.findall(r'<script>', offline)) == 7
for s in ('window.HISTORY_DATA', 'window.ERA_DATA', 'window.YEAR_SUPPLEMENT', 'window.HistoryApp', 'host.BirthCalendar', 'window.BirthApp'):
    assert s in offline, s
# Web calls are not part of the delivered runtime. Links to optional source
# pages do not load until the reader explicitly clicks them.
runtime = '\n'.join((DIST / n).read_text(encoding='utf-8') for n in ('history-core.js', 'app.js', 'birth-core.js', 'birth-ui.js'))
assert not re.search(r'\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket', runtime)
archive = DIST / 'source.zip'
files = [ROOT / 'README.md', ROOT / 'NOTICE.md', ROOT / 'LICENSE']
for folder in ('dist', 'sources', 'tools'):
    files.extend(p for p in (ROOT / folder).rglob('*') if p.is_file() and p != archive and '__pycache__' not in p.parts and p.name != 'offline-build.json')
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in sorted(set(files)):
        info = zipfile.ZipInfo(p.relative_to(ROOT).as_posix(), date_time=(2026, 11, 9, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        z.writestr(info, p.read_bytes())
report = {'version':'2.1.0', 'built':'2026-11-09', 'features':['historical-calendar','concurrent-eras','birth-eight-characters','nayin','monthly-main-qi-pattern-reference'], 'offline':str(out), 'offline_bytes':out.stat().st_size, 'source_bytes':archive.stat().st_size, 'source_files':len(set(files)), 'offline_sha256':hashlib.sha256(out.read_bytes()).hexdigest()}
(DIST / 'offline-build.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
