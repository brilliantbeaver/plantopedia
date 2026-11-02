#!/usr/bin/env python3
"""Execute all notebook cells in fresh kernels, with and without optional widgets.

Requires nbformat, nbclient, ipykernel, and ipywidgets for the widget mode.
Use --save to retain rendered outputs in the delivered notebooks.
"""
import argparse
import json
import os
from pathlib import Path
import sys
import time
import nbformat
from nbclient import NotebookClient

ROOT = Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--save',action='store_true')
args=parser.parse_args()
results=[]
started=time.time()
for mode in ['widgets','fallback']:
    for path in sorted((ROOT/'notebooks').glob('*.ipynb')):
        nb=nbformat.read(path,as_version=4)
        nbformat.validate(nb)
        env=dict(os.environ)
        if mode=='fallback':env['PLANTOPEDIA_NO_WIDGETS']='1'
        else:env.pop('PLANTOPEDIA_NO_WIDGETS',None)
        client=NotebookClient(nb,timeout=60,kernel_name='python3',resources={'metadata':{'path':str(ROOT/'notebooks')}},store_widget_state=True)
        try:
            client.execute(env=env)
            errors=[o for c in nb.cells if c.cell_type=='code' for o in c.outputs if o.output_type=='error']
            if errors:raise RuntimeError(str(errors))
            outputs=sum(len(c.get('outputs',[])) for c in nb.cells)
            if args.save and mode=='widgets':nbformat.write(nb,path)
            results.append({'notebook':path.name,'mode':mode,'passed':True,'cells':len(nb.cells),'output_blocks':outputs})
            print(f'PASS {mode:8} {path.name} ({outputs} outputs)',flush=True)
        except Exception as exc:
            results.append({'notebook':path.name,'mode':mode,'passed':False,'error':str(exc)})
            print(f'FAIL {mode} {path.name}: {exc}',flush=True)
report={'python':sys.version.split()[0],'elapsed_seconds':round(time.time()-started,2),'results':results,'all_passed':all(r['passed'] for r in results)}
(ROOT/'review'/'notebook-execution.json').write_text(json.dumps(report,indent=2)+'\n')
if not report['all_passed']:sys.exit(1)
