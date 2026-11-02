#!/usr/bin/env python3
"""Build static course content, standalone Python notebooks, and portable downloads.

Run from any directory with Python 3.9+. Uses only the Python standard library.
Generated code is never evaluated while building. Source JSON is the teaching text.
"""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import zipfile
from notebook_labs import LABS, PRACTICE, NOTEBOOK_EXPERIMENTS

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]

def inline(s):
    return re.sub(r'`([^`]+)`', r'<code>\1</code>', html.escape(str(s)))

def paras(items):
    return ''.join('<p>' + inline(s) + '</p>' for s in items)

def cell(kind, source, index):
    result = {'cell_type': kind, 'id': f'cell-{index:03}', 'metadata': {}, 'source': source.strip() + '\n'}
    if kind == 'code':
        result.update(execution_count=None, outputs=[])
    return result

SETUP = '''from IPython.display import display, HTML, SVG
import json
import os
import inspect

# Widgets are optional. Without them, edit parameters and rerun the model cell.
try:
    if os.environ.get('PLANTOPEDIA_NO_WIDGETS') == '1':
        raise ImportError('Widget-free verification mode')
    import ipywidgets as widgets
except ImportError:
    widgets = None

def explore(function, **controls):
    if widgets is not None:
        display(widgets.interactive(function, **controls))
    else:
        print('Optional controls are unavailable. Edit the explorer function defaults and rerun this model cell.')
        defaults = {name: parameter.default for name, parameter in inspect.signature(function).parameters.items()}
        print('Using function defaults:', defaults)
        function()

print('Python teaching model ready. React Native TSX runs separately in Expo.')
'''

def notebook(lesson):
    cells = []
    def md(s): cells.append(cell('markdown',s,len(cells)))
    def py(s): cells.append(cell('code',s,len(cells)))
    ident = lesson['id']
    md(f"# {ident}. {lesson['title']}\n\n{lesson['subtitle']}\n\n**{lesson['minutes']} minutes including practice · {lesson['stage']}**\n\nThis is a **Python 3 notebook**. It contains the complete lesson, embedded vector illustrations, React Native examples for reading, and executable Python models. Python does not run React Native. Run the `.tsx` exercise in Expo using the workbook instructions. No cloud credentials or live services are needed for the notebook.\n\nRun the cells from top to bottom. Change a control, make a prediction, then explain the result. If widgets are unavailable, edit a model's default arguments and rerun its cell.\n\nIf you have the complete course folder, [open the interactive guide](../index.html#lesson-{ident}) or [read the exercise instructions](../exercises/README.md). These companion links are absent in a notebooks-only or single-lesson download; the notebook itself still runs independently.")
    md('## What you will be able to do\n\n'+'\n'.join('- '+x for x in lesson['outcomes'])+'\n\n## Before you begin\n\n'+'\n\n'.join(lesson['prerequisites']))
    py(SETUP)
    md('\n\n'.join(lesson['intro']))
    seen=set()
    for section in lesson['sections']:
        md('## '+section['title']+'\n\n'+'\n\n'.join(section['paragraphs']))
        if section.get('diagram') and section['diagram'] not in seen:
            key=section['diagram'];seen.add(key)
            svg=(ROOT/'assets'/f'{key}.svg').read_text()
            py('# Embedded original vector illustration; no external image files are required.\ndisplay(SVG(data='+repr(svg)+'))')
        snippets=([section['code']] if section.get('code') else [])+section.get('codes',[])
        for snippet in snippets:
            md('**'+snippet.get('filename','React Native teaching example')+'**\n\nRead this example here; TSX runs in Expo, while shell commands run in a terminal. This notebook uses a Python kernel.\n\n```'+snippet['language']+'\n'+snippet['text']+'\n```')
        if section.get('callout'):
            md('> **'+section['callout']['title']+'**\n>\n> '+section['callout']['text'])
    md('## Experiment: predict, change, explain\n\n'+NOTEBOOK_EXPERIMENTS[ident]+'\n\nThe cell below is a bounded Python analogy of the lesson. Its fixtures do not call the app API, request permission, or certify device behavior. Its assertions check the stated model only.')
    py(LABS[ident])
    prompt,starter,condition,reason=PRACTICE[ident]
    md('## Make a prediction of your own\n\n'+prompt+'\n\nReplace `None` below. A blank answer reports **not attempted**; it is never counted as passing. The check gives feedback without interrupting “Run All.”')
    py(starter+f"\nif your_answer is None:\n    print('Not attempted. Replace None, then rerun this cell.')\nelif {condition}:\n    print('Correct. '+{reason!r})\nelse:\n    print('Revisit your prediction. '+{reason!r})")
    quiz_lines=[]
    for i,item in enumerate(lesson['quiz']):
        quiz_lines.append(f"**{i+1}. {item['question']}**\n\n"+'\n'.join(f'{j+1}. {opt}' for j,opt in enumerate(item['options'])))
    md('## Retrieve the ideas\n\n'+'\n\n'.join(quiz_lines)+'\n\nSet each value in the next cell to your selected option number, starting at 1. You can change it and rerun for more feedback.')
    py('quiz = '+repr(lesson['quiz'])+'''\nanswers = [None, None, None]  # Replace None with 1, 2, or 3.
correct = 0
for number, (question, answer) in enumerate(zip(quiz, answers), 1):
    if answer is None:
        print(f'{number}. Not attempted.')
    elif type(answer) is not int or answer not in range(1, len(question['options']) + 1):
        print(f'{number}. Choose a valid option number.')
    else:
        right = answer - 1 == question['answer']
        correct += int(right)
        print(f"{number}. {'Correct' if right else 'Revisit this idea'}. {question['explanation']}")
print(f'{correct} of {len(quiz)} correct; unanswered questions do not count as passing.')
''')
    ex=lesson['exercise']
    md('## Build in Expo: '+ex['title']+'\n\n'+ex['brief']+'\n\n'+'\n'.join(f'{i+1}. {x}' for i,x in enumerate(ex['steps']))+'\n\n### Check your result\n\n'+'\n'.join('- [ ] '+x for x in ex['acceptance'])+'\n\nDownload the matching exercise bundle from the HTML course, or use the `exercises` folder if you downloaded the complete course. A notebooks-only download does not include that folder. Files under `docs/tutorials` do not become Expo routes until copied as instructed. The numbered workbook supplies a related concrete practice task; the inline exercise can ask you to extend it.')
    md('<details><summary>Hint</summary>\n\n'+ex['hint']+'\n\n</details>\n\n<details><summary>Worked reasoning / solution</summary>\n\n```text\n'+ex['solution']+'\n```\n\n</details>')
    md('## Explain it in your own words\n\n'+lesson['reflection']+'\n\n*Write your explanation in the Markdown cell below. Save the notebook to keep your work.*')
    md('My explanation:\n\n<!-- Replace this comment with a connected explanation and an example. -->')
    md('## Find this idea in the app\n\n'+'\n\n'.join(f"- [{x['path']}](../../../{x['path']}) — {x['why']}" for x in lesson['repo'])+'\n\nRepository links require this notebook to remain in the checkout’s `docs/tutorials/notebooks` folder. Downloaded notebooks still contain every explanation and embedded diagram.\n\n## Primary documentation\n\n'+'\n'.join(f"- [{x['title']}]({x['url']})" for x in lesson['sources']))
    md('## Carry these ideas forward\n\n'+'\n'.join('- '+x for x in lesson['takeaways']))
    obj={'cells':cells,'metadata':{'kernelspec':{'display_name':'Python 3 (ipykernel)','language':'python','name':'python3'},'language_info':{'name':'python','version':'3.9','file_extension':'.py','mimetype':'text/x-python','pygments_lexer':'ipython3'},'plantopedia':{'lesson':ident,'native_execution':False,'version':'1.0'}},'nbformat':4,'nbformat_minor':5}
    (ROOT/'notebooks'/f"{ident}-{lesson['slug']}.ipynb").write_text(json.dumps(obj,ensure_ascii=False,indent=1)+'\n')


def static_reader(lessons):
    s=['<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Plantopedia — Complete course reader</title><link rel="stylesheet" href="assets/course.css"></head><body class="reader"><header><h1>Plantopedia builder’s field guide</h1><p>A complete, printable reading copy. <a href="index.html">Open the interactive course</a>.</p></header><main><p class="reader-note">Browser labs are JavaScript models. Jupyter notebooks use Python models and display React Native examples. Actual TSX runs in Expo. This static reading copy includes every lesson, check, hint, and solution, and needs no JavaScript.</p><nav aria-label="Course contents"><ol>']
    for l in lessons: s.append(f'<li><a href="#reader-{l["id"]}">{html.escape(l["title"])}</a> · {l["minutes"]} minutes</li>')
    s.append('</ol></nav>')
    for l in lessons:
        ident=l['id'];s.append(f'<article class="lesson-reader" id="reader-{ident}"><p class="eyebrow">LESSON {ident} · {html.escape(l["stage"])}</p><h1>{html.escape(l["title"])}</h1><p class="lead">{html.escape(l["subtitle"])}</p><h2>By the end, you can…</h2><ul>'+''.join('<li>'+inline(x)+'</li>' for x in l['outcomes'])+'</ul><h3>Bring with you</h3>'+paras(l['prerequisites'])+paras(l['intro']))
        for section in l['sections']:
            s.append('<section class="teaching-section"><h2>'+html.escape(section['title'])+'</h2>'+paras(section['paragraphs']))
            if section.get('diagram'):
                key=section['diagram'];s.append(f'<figure class="diagram"><div class="diagram-scroll" tabindex="0" role="region" aria-label="Scrollable {key} diagram"><img src="assets/{key}.svg" alt="{html.escape(key.capitalize())} concept diagram; a full text explanation appears directly above." width="980" height="390" loading="lazy"></div><figcaption>Original vector diagram. Scroll horizontally on a narrow screen. <a href="assets/{key}.svg" download>Download the SVG</a>.</figcaption></figure>')
            snippets=([section['code']] if section.get('code') else [])+section.get('codes',[])
            for c in snippets:s.append('<div class="code-block"><div class="code-heading">'+html.escape(c.get('filename','Teaching example'))+'</div><pre tabindex="0"><code>'+html.escape(c['text'])+'</code></pre></div>')
            if section.get('callout'):s.append('<aside class="callout"><strong>'+html.escape(section['callout']['title'])+'</strong><p>'+inline(section['callout']['text'])+'</p></aside>')
            s.append('</section>')
        s.append('<section class="static-lab"><h2>Experiment</h2><p>'+inline(l['lab']['instructions'])+f'</p><p><a href="index.html#lesson-{ident}">Use this lesson’s interactive lab</a>, or open its Python notebook.</p></section><section class="teaching-section"><h2>Check your understanding</h2>')
        for q in l['quiz']:
            s.append('<h3>'+html.escape(q['question'])+'</h3><ol>'+''.join('<li>'+inline(x)+'</li>' for x in q['options'])+'</ol><details><summary>Check the answer and reasoning</summary><p><strong>Option '+str(q['answer']+1)+'.</strong> '+inline(q['explanation'])+'</p></details>')
        ex=l['exercise'];s.append('<section class="exercise-card"><h2>'+html.escape(ex['title'])+'</h2><p>'+inline(ex['brief'])+'</p><ol>'+''.join('<li>'+inline(x)+'</li>' for x in ex['steps'])+'</ol><h3>Acceptance criteria</h3><ul>'+''.join('<li>'+inline(x)+'</li>' for x in ex['acceptance'])+'</ul><details><summary>Hint</summary><p>'+inline(ex['hint'])+'</p></details><details><summary>Worked solution</summary><pre style="white-space:pre-wrap">'+html.escape(ex['solution'])+'</pre></details></section>')
        s.append('<h2>Explain it in your own words</h2><p>'+inline(l['reflection'])+'</p><h2>Find this idea in Plantopedia</h2><ul>'+''.join(f'<li><a href="../../{html.escape(x["path"])}">{html.escape(x["path"])}</a> — {inline(x["why"])}</li>' for x in l['repo'])+'</ul><h3>Primary documentation</h3><ul>'+''.join(f'<li><a href="{html.escape(x["url"])}">{html.escape(x["title"])}</a></li>' for x in l['sources'])+'</ul><section class="takeaways"><h2>Carry forward</h2><ul>'+''.join('<li>'+inline(x)+'</li>' for x in l['takeaways'])+'</ul></section></section></article>')
    s.append('</main></body></html>')
    (ROOT/'course-reader.html').write_text('\n'.join(s)+'\n')

EXERCISE_DIRS=['01-runtime','02-components','03-navigation','04-state','05-network','06-boundaries','07-camera','08-offline','09-platform','10-capstone']
def add_folder(z,folder,prefix):
    for f in sorted(folder.rglob('*')):
        if f.is_file() and not any(part in ['__pycache__','.DS_Store','.venv','.qa-venv'] for part in f.parts):
            z.write(f,str(Path(prefix)/f.relative_to(folder)))


def bundle_start_here(name):
    if name == 'plantopedia-notebooks':
        return """# Plantopedia notebook bundle

Extract the ZIP before opening a notebook. This download contains ten standalone Python notebooks in `notebooks/`. It does not contain the interactive HTML guide or Expo exercise workspace; those are separate downloads.

From this extracted folder, create a Python 3.9+ environment and start Jupyter:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install jupyterlab ipywidgets
jupyter lab notebooks
```

On Windows, activate the environment with `.venv\\Scripts\\activate.bat` in Command Prompt instead of the `source` command. Choose the Python 3 kernel and run cells in order. Widgets are optional. Without widgets, edit an explorer function's default arguments and rerun its model cell; the active defaults are printed. Prediction cells start with `None` and do not count as attempted until edited.

The notebooks include lesson text, embedded SVGs, fixtures, Python models, and TSX examples for reading. Python does not run React Native. No cloud account, camera, microphone, or live API is used by the models. Run TSX in the configured Expo repository using the separate exercise workspace. Repository and course companion links work only when those files are present in their original relative locations. Save each notebook to keep your work.
"""
    return """# Plantopedia exercise workspace

Extract the ZIP first, then open [the exercise instructions](exercises/README.md). This download contains editable React Native starters, worked solutions, a fixture-backed capstone, and dependency-free JavaScript checks. It does not contain the HTML course or Jupyter notebooks; those are separate downloads.

From this extracted folder, run the worked logic checks:

```sh
cd exercises
node --test logic/checks.test.mjs
```

To practice, edit `logic/starter.mjs` and run `LAB_MODE=starter node --test logic/checks.test.mjs` in a POSIX shell. In PowerShell, use `$env:LAB_MODE='starter'; node --test logic/checks.test.mjs`. The starters intentionally fail until completed.

Node checks exercise bounded JavaScript models. TSX screens run through Expo in an installed Plantopedia checkout, after the documented setup and file placement in `exercises/README.md`. Use the repository's pinned Node 22.23.1, npm 12.0.2, and Expo 57 setup for app work. Camera, native glass, durable device storage, and microphone behavior still need device acceptance. No new cloud integration is provisioned by these exercises.
"""

def archives(lessons):
    target=ROOT/'downloads';target.mkdir(exist_ok=True)
    for l,folder in zip(lessons,EXERCISE_DIRS):
        with zipfile.ZipFile(target/f'lesson-{l["id"]}.zip','w',zipfile.ZIP_DEFLATED) as z:
            add_folder(z,ROOT/'exercises'/folder,'exercise')
            add_folder(z,ROOT/'exercises'/'logic','logic')
            z.write(ROOT/'notebooks'/f'{l["id"]}-{l["slug"]}.ipynb',f'{l["id"]}-{l["slug"]}.ipynb')
            z.writestr('START-HERE.md',f'# Lesson {l["id"]}: {l["title"]}\n\nRead exercise/README.md for the exact placement in an installed Plantopedia checkout. The TSX files run in Expo; they do not execute in Jupyter or Node. The notebook is standalone and uses a Python 3 kernel. Install JupyterLab and optionally ipywidgets in a Python virtual environment, then open it. No live service is needed for the notebook.\n\nFor the logic workbook: run `node --test logic/checks.test.mjs` (solutions) or `LAB_MODE=starter node --test logic/checks.test.mjs` (expected failures until you implement the starter). The logic folder includes checks for the whole course; use `--test-name-pattern="{l["id"]} "` to select this lesson.\n\nThe complete course kit includes every exercise and shared setup instructions. Repository-relative links in a standalone notebook need its original checkout location.\n')
    for name,folder in [('plantopedia-exercises','exercises'),('plantopedia-notebooks','notebooks')]:
        with zipfile.ZipFile(target/f'{name}.zip','w',zipfile.ZIP_DEFLATED) as z:
            add_folder(z,ROOT/folder,folder)
            z.writestr('START-HERE.md', bundle_start_here(name))
    with zipfile.ZipFile(target/'plantopedia-course-kit.zip','w',zipfile.ZIP_DEFLATED) as z:
        for f in sorted(ROOT.rglob('*')):
            if not f.is_file() or f.name=='plantopedia-course-kit.zip':continue
            rel=f.relative_to(ROOT)
            # The external manifest is written after this ZIP; never embed its stale prior copy.
            if rel == Path('downloads/manifest.json'):continue
            if any(x in ['__pycache__','.venv','.qa-venv','.DS_Store','screenshots','node_modules','.git'] for x in rel.parts):continue
            z.write(f,str(Path('plantopedia-course')/rel))
    manifest={f.name:{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(target.glob('*.zip'))}
    (target/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archives-only", action="store_true", help="Repackage current files without replacing executed notebook outputs.")
    args = parser.parse_args()
    lessons=[json.loads(f.read_text()) for f in sorted((ROOT/'content').glob('[0-9][0-9]-*.json'))]
    if [l['id'] for l in lessons] != [f'{n:02}' for n in range(1,11)]:raise ValueError('Expected ten sequential lessons')
    if args.archives_only:
        archives(lessons)
        print('Rebuilt 13 archives and the download manifest from current deliverables.')
        return
    for l in lessons:
        if len(l['quiz'])!=3 or len(l['sections'])<4:raise ValueError('Incomplete lesson '+l['id'])
        for q in l['quiz']:
            if q['answer'] not in range(len(q['options'])):raise ValueError('Invalid quiz answer')
        for r in l['repo']:
            if not (REPO/r['path']).is_file():raise ValueError('Broken repository anchor: '+r['path'])
        notebook(l)
    (ROOT/'assets'/'lessons.js').write_text('/* Generated from content/*.json by tools/build_course.py. */\nwindow.PLANTOPEDIA_LESSONS = '+json.dumps(lessons,ensure_ascii=False,indent=2)+';\n')
    static_reader(lessons)
    if not (ROOT/'README.md').is_file():raise ValueError('Write README.md before building archives')
    archives(lessons)
    print(f'Built {len(lessons)} lessons, {len(lessons)} self-contained notebooks, static reader, and 13 ZIP downloads.')

if __name__=='__main__':main()
