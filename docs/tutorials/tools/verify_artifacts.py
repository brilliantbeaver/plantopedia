#!/usr/bin/env python3
"""Verify course links, SVG structure, notebook presence, and archive content integrity.

Uses only the standard library. Run after build_course.py --archives-only.
"""
from pathlib import Path, PurePosixPath
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import hashlib
import json
import zipfile
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.ids=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        for key in ['href','src']:
            if key in a:self.links.append(a[key])

checks=[]
for page in [ROOT/'index.html',ROOT/'course-reader.html']:
    parsed=Links();parsed.feed(page.read_text())
    assert len(parsed.ids)==len(set(parsed.ids)),f'Duplicate IDs in {page.name}'
    for value in parsed.links:
        parts=urlsplit(value)
        if parts.scheme or parts.netloc or not parts.path:continue
        destination=(page.parent/unquote(parts.path)).resolve()
        assert destination.is_file(),f'Missing local target {value} in {page.name}'
    checks.append(f'{page.name}: unique IDs and all local link/image/script targets exist')
for f in (ROOT/'assets').glob('*.svg'):
    element=ET.parse(f).getroot()
    assert element.attrib.get('viewBox'),f'No viewBox: {f.name}'
checks.append('13 SVGs parse and have scalable viewBoxes')
lessons=[json.loads(f.read_text()) for f in sorted((ROOT/'content').glob('*.json'))]
assert len(lessons)==10 and sum(len(l['quiz']) for l in lessons)==30
for lesson in lessons:
    path=ROOT/'notebooks'/f"{lesson['id']}-{lesson['slug']}.ipynb"
    nb=json.loads(path.read_text());assert nb['nbformat']==4
    assert len(nb['cells'])>=20
    assert not [o for c in nb['cells'] for o in c.get('outputs',[]) if o['output_type']=='error']
checks.append('10 full notebooks and 30 quiz questions; no stored error outputs')
manifest=json.loads((ROOT/'downloads'/'manifest.json').read_text())
assert len(manifest)==13
for name,record in manifest.items():
    raw=(ROOT/'downloads'/name).read_bytes()
    assert len(raw)==record['bytes']
    assert hashlib.sha256(raw).hexdigest()==record['sha256'],f'Checksum mismatch: {name}'
    with zipfile.ZipFile(ROOT/'downloads'/name) as z:
        assert z.testzip() is None,f'CRC failure: {name}'
        for member in z.namelist():
            p=PurePosixPath(member)
            assert not p.is_absolute() and '..' not in p.parts,f'Unsafe member {member}'
            assert not any(part.startswith('.env') for part in p.parts),f'Environment file in archive: {member}'
checks.append('All 13 ZIPs pass CRC, safe-path, environment-file exclusion, byte-size, and SHA-256 checks')
with zipfile.ZipFile(ROOT/'downloads'/'plantopedia-notebooks.zip') as z:
    for p in (ROOT/'notebooks').glob('*.ipynb'):assert z.read('notebooks/'+p.name)==p.read_bytes()
    assert b'notebooks/' in z.read('START-HERE.md')
    assert b'[index.html]' not in z.read('START-HERE.md')
checks.append('Notebook bundle matches delivered executed notebooks and has bundle-specific instructions')
with zipfile.ZipFile(ROOT/'downloads'/'plantopedia-exercises.zip') as z:
    for p in (ROOT/'exercises').rglob('*'):
        if p.is_file() and '__pycache__' not in p.parts:assert z.read('exercises/'+str(p.relative_to(ROOT/'exercises')))==p.read_bytes()
    assert b'exercises/README.md' in z.read('START-HERE.md')
checks.append('Exercise bundle matches every current workspace file and has bundle-specific instructions')
with zipfile.ZipFile(ROOT/'downloads'/'plantopedia-course-kit.zip') as z:
    names=z.namelist()
    assert 'plantopedia-course/index.html' in names
    assert 'plantopedia-course/downloads/manifest.json' not in names,'Stale external manifest embedded'
    assert 'plantopedia-course/downloads/plantopedia-course-kit.zip' not in names,'Self-recursive ZIP'
    for p in [ROOT/'index.html',ROOT/'assets'/'course.js',ROOT/'assets'/'lessons.js',ROOT/'review'/'verification.md']:
        assert z.read('plantopedia-course/'+str(p.relative_to(ROOT)))==p.read_bytes()
checks.append('Complete kit matches current course code and review; excludes self-recursion and stale manifest')
for l in lessons:
    with zipfile.ZipFile(ROOT/'downloads'/f'lesson-{l["id"]}.zip') as z:
        assert 'exercise/README.md' in z.namelist()
        name=f'{l["id"]}-{l["slug"]}.ipynb';assert z.read(name)==(ROOT/'notebooks'/name).read_bytes()
        assert 'logic/checks.test.mjs' in z.namelist()
checks.append('All 10 per-lesson ZIPs include current notebook, exercise instructions, and logic workbook')
report={'all_passed':True,'checks':checks}
(ROOT/'review'/'artifact-verification.json').write_text(json.dumps(report,indent=2)+'\n')
for check in checks:print('PASS',check)
