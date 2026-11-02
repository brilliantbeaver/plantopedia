"""Generate the course's original, self-contained SVG illustrations."""
from pathlib import Path
from html import escape
OUT = Path(__file__).resolve().parents[1] / 'assets'
OUT.mkdir(exist_ok=True)
DEFS = '''<defs>
<linearGradient id="bg" x2="1" y2="1"><stop stop-color="#effff8"/><stop offset="1" stop-color="#edf3ff"/></linearGradient>
<linearGradient id="leaf" x2="1" y2="1"><stop stop-color="#37e6b0"/><stop offset="1" stop-color="#07886c"/></linearGradient>
<linearGradient id="glass" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".94"/><stop offset="1" stop-color="#e2efff" stop-opacity=".72"/></linearGradient>
<linearGradient id="violet" x2="1" y2="1"><stop stop-color="#a58cff"/><stop offset="1" stop-color="#6550d9"/></linearGradient>
<marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#426f71" stroke-width="1.4"/></marker>
</defs>'''
def text(x,y,s,size=19,color='#163c3d',weight=500,anchor='start'):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}">{escape(s)}</text>'
def rect(x,y,w,h,fill='url(#glass)',stroke='#bbd8d2',r=20):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>'
def node(x,y,w,title,sub,color='#d1f7e9',number=None):
    s=rect(x,y,w,105,color)
    if number is not None:
        s+=f'<circle cx="{x+25}" cy="{y+25}" r="13" fill="#163c3d"/>'+text(x+25,y+30,str(number),14,'#fff',700,'middle')
    return s+text(x+17,y+54,title,20,weight=700)+text(x+17,y+80,sub,15)
def arrow(x1,y1,x2,y2,label=''):
    s=f'<path d="M{x1} {y1}L{x2} {y2}" stroke="#426f71" stroke-width="2" fill="none" marker-end="url(#arrow)"/>'
    if label: s+=text((x1+x2)/2,(y1+y2)/2-12,label,14,anchor='middle')
    return s
def save(name,title,desc,body,w=980,h=390):
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">{escape(desc)}</desc>{DEFS}<g font-family="system-ui,-apple-system,Segoe UI,sans-serif">{rect(1,1,w-2,h-2,"url(#bg)","#c8dfd8",26)}{body}</g></svg>'
    (OUT/f'{name}.svg').write_text(svg)
def heading(title,sub):return text(32,45,title,24,weight=750)+text(32,74,sub,16)
# A shared component description, three actual render targets.
b=heading('One component description. Three render targets.','Expo supplies tools and native modules; React Native turns the description into platform views.')
b+=node(35,146,210,'PlantCard.tsx','Props + state → JSX',number=1)+arrow(245,198,337,198,'render')
b+=node(340,146,230,'React Native','Shared component model','#e7e0ff',2)
for y,t,s in [(108,'iOS','Native views'),(195,'Android','Native views'),(282,'Web','DOM via RN Web')]:
    b+=rect(727,y-22,215,63,'#fff')+text(744,y+4,t,19,weight=700)+text(744,y+25,s,14)
    b+=f'<path d="M570 198H640V{y+8}H720" fill="none" stroke="#426f71" stroke-width="2" marker-end="url(#arrow)"/>'
save('runtime','React Native render targets','A TypeScript component is described once. React Native renders native views on iOS and Android. React Native Web renders DOM in a browser. Expo Go includes a fixed set of native modules.',b)
# Component tree and props/events arrows.
b=heading('Small components make a screen easier to reason about.','Data travels down as props. A callback lets a child ask its parent to change something.')
b+=node(343,98,285,'GardenScreen','Owns the selected specimen','#e7e0ff')
for x,title,sub in [(35,'PageHeader','title="My garden"'),(354,'PlantCard','plant={fern}'),(673,'SaveButton','onPress={save}')]:
    b+=node(x,255,260,title,sub)+arrow(485,203,x+130,247,'props')
b+=f'<path d="M915 273V126H635" fill="none" stroke="#7351b7" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#arrow)"/>'+text(740,114,'callback request',14,'#6842ac')
save('components','Components, props, and callbacks','GardenScreen gives props to PageHeader, PlantCard, and SaveButton. SaveButton calls a callback to ask for a change. The owner decides how state changes.',b)
# Flex axes.
b=heading('The main axis follows flexDirection.','React Native defaults to column. Gap separates siblings; padding separates content from the edge.')
for x,title,direction in [(35,'flexDirection: column','column'),(510,'flexDirection: row','row')]:
    b+=rect(x,109,430,228,'#fff')+text(x+18,140,title,20,weight=700)
    if direction=='column':
        for j,col in enumerate(['#a7eed5','#c8beff','#ffd28d']):b+=rect(x+68,158+j*48,235,34,col,r=9)+text(x+85,181+j*48,f'Child {j+1}',16)
        b+=arrow(x+34,164,x+34,305)+text(x+330,222,'main',15)+text(x+330,245,'axis ↓',15)
    else:
        for j,col in enumerate(['#a7eed5','#c8beff','#ffd28d']):b+=rect(x+25+j*130,179,110,94,col,r=12)+text(x+80+j*130,232,f'Child {j+1}',16,anchor='middle')
        b+=arrow(x+32,304,x+390,304,'main axis →')
b+=text(35,368,'Try the layout lab: change direction, gap, and width. Check the long plant name.',16)
save('layout','Flexbox main axes','Two containers compare a column with a vertical main axis and a row with a horizontal main axis. Three children retain their order. A narrow screen still needs readable text.',b)
# Navigation.
b=heading('The route identifies a specimen, not a species.','A route group organizes the files without adding a segment to the URL.')
b+=rect(35,109,410,229,'#fff')+text(55,143,'src/app/',20,weight=700)
for y,s in [(180,'(tabs)/_layout.tsx  →  tab shell'),(217,'(tabs)/plants.tsx  →  /plants'),(254,'plants/[plantId].tsx'),(291,'[plantId] reads the selected ID')]:b+=text(55,y,s,17)
b+=arrow(447,224,526,224,'push')
b+=node(550,111,383,'/plants/fern_kitchen','The fern beside your kitchen window','#d1f7e9')+node(550,245,383,'/plants/fern_patio','A different fern, with its own history','#e7e0ff')
save('navigation','Files, URLs, and specimen identity','The tabs route group is omitted from URLs. plants/[plantId].tsx receives a stable specimen ID. Two ferns have different paths and histories even if they share a scientific name.',b)
# State.
b=heading('A state update asks React for a new render.','Each render sees a snapshot. A functional updater receives the latest queued value.')
for x,t,s,c,n in [(32,'Render','count is 0','#d1f7e9',1),(277,'One event','queue 2 updaters','#e7e0ff',2),(522,'Apply updates','0 → 1 → 2','#ffe2ad',3),(767,'Render again','count is now 2','#d1f7e9',4)]:b+=node(x,137,182,t,s,c,n)
for x in [214,459,704]:b+=arrow(x,190,x+54,190)
b+=rect(35,277,907,65,'#fff')+text(56,305,'Keep one source of truth.',18,weight=700)+text(56,329,'Derive filtered plants from plants + search text; do not store a second copy of the result.',16)
save('state','State snapshots and queued updates','A render sees count zero. Two functional updater calls queue increments, React applies them to obtain two, and the next render displays two. Derive filtered data from the original list.',b)
# Network.
b=heading('A response has to pass two checks before it becomes data.','A completed HTTP request can still contain an error status or an unexpected JSON shape.')
for x,t,s,c,n in [(30,'Request','owner + token','#d1f7e9',1),(277,'HTTP status','response.ok?','#e7e0ff',2),(524,'JSON shape','schema.parse(json)','#ffe2ad',3),(771,'Render','data or empty','#d1f7e9',4)]:b+=node(x,126,180,t,s,c,n)
for x in [211,458,705]:b+=arrow(x,179,x+56,179)
b+=arrow(367,232,367,287)+arrow(614,232,614,287)+rect(258,291,470,62,'#ffe9e1','#e4b6ab')+text(493,317,'Error state: explain, preserve work, offer retry',17,weight=650,anchor='middle')+text(493,340,'Loading, empty, success, and error are distinct.',15,anchor='middle')
save('network','Request status and runtime validation','After a request, check HTTP success and then validate the response body. Either check can lead to an error state. Successful empty data is different from a failure.',b)
# Security.
b=heading('The phone asks. The server decides what it may access.','Public configuration is bundled into the app; provider credentials stay on the server.')
b+=node(35,146,242,'Expo app','Public API URL + Clerk key',number=1)+arrow(280,198,370,198,'Bearer token')+node(375,146,247,'API trust boundary','Verify identity + ownership','#e7e0ff',2)+arrow(625,198,713,198,'authorized')+node(719,146,227,'Private storage','Owner-scoped records','#d1f7e9',3)
b+=f'<path d="M350 100V314" stroke="#b85c43" stroke-width="2" stroke-dasharray="7 6"/>'+text(352,341,'No server secret crosses this boundary into the app bundle.',17,anchor='middle')
save('security','Client and server trust boundary','The Expo app sends an authentication token to the API. The API verifies identity and ownership before reading private storage. A client query key is not authorization.',b)
# Camera.
b=heading('A photograph moves through several different states.','Permission allows access. Camera readiness allows a shot. A saved original allows recovery.')
for x,t,s,c,n in [(30,'Permission','request on user intent','#e7e0ff',1),(277,'Ready camera','onCameraReady','#d1f7e9',2),(524,'Retain original','durable device copy','#ffe2ad',3),(771,'Prepare copy','upright + clean JPEG','#d1f7e9',4)]:b+=node(x,137,180,t,s,c,n)
for x in [211,458,705]:b+=arrow(x,189,x+56,189)
b+=rect(35,278,907,65,'#fff')+text(55,306,'Denied permission is a supported state.',18,weight=700)+text(55,331,'Offer the photo library. Saving a specimen does not require a successful identification.',16)
save('camera','Camera permission, readiness, and retention','A permission request is followed by a ready camera, retention of the original, and preparation of a separate upload derivative. Denied permission can lead to choosing a library photo.',b)
# Outbox.
b=heading('Persist the last acknowledged checkpoint. Retry with the same key.','A lost response is uncertain: the server may already have accepted the write.')
for i,(t,s) in enumerate([('draft','Retain device work'),('plant','Record saved'),('observation','Note saved'),('photo','Image saved'),('complete','Sync finished')]):
    x=26+i*193;b+=node(x,126,162,t,s,'#e7e0ff' if i==0 else '#d1f7e9',i+1)
    if i<4:b+=arrow(x+164,177,x+184,177)
b+=f'<path d="M570 240V288H380V239" fill="none" stroke="#9e6044" stroke-width="2" stroke-dasharray="7 5" marker-end="url(#arrow)"/>'+text(490,317,'No acknowledgment? Retry the same operation key.',17,anchor='middle')+text(490,348,'A changed account or a deleted record must stop the retry.',16,anchor='middle')
save('outbox','Durable outbox checkpoints','The native save flow acknowledges plant, observation, and photo stages before completing. A lost acknowledgment triggers retry with a stable operation key. Owner changes and deleted records stop replay.',b)
# Quality pyramid.
b=heading('Different checks answer different questions.','A green JavaScript test cannot prove that a real microphone, camera, or app-store build works.')
for x,y,w,h,c,title,sub in [(260,115,460,61,'#e7e0ff','Real-device acceptance','Permissions · camera · audio · large text'),(172,187,636,61,'#c7f1e8','Component and API tests','Visible outcomes · auth · retries · failures'),(70,259,840,61,'#d8e9ff','Types and pure-logic tests','Contracts · immutable state · sequence transitions')]:
    b+=rect(x,y,w,h,c)+text(x+w/2,y+25,title,19,weight=700,anchor='middle')+text(x+w/2,y+48,sub,15,anchor='middle')
b+=text(490,357,'Release only after the platform-specific evidence is recorded.',17,anchor='middle')
save('quality','Layers of evidence for a release','Types and pure logic checks form a wide foundation. Component and API tests cover visible outcomes and transport behavior. Real devices verify permissions, camera, audio, and large text.',b)
# Voice.
b=heading('A voice session owns resources until it ends.','Starting a new generation prevents old callbacks from changing the next session.')
for x,t,s,c,n in [(30,'Idle','No microphone','#d1f7e9',1),(277,'Connect','Token + socket','#e7e0ff',2),(524,'Listen / speak','Audio queue + captions','#ffe2ad',3),(771,'End / cleanup','Stop, close, clear','#d1f7e9',4)]:b+=node(x,137,180,t,s,c,n)
for x in [211,458,705]:b+=arrow(x,189,x+56,189)
b+=f'<path d="M857 243V311H119V243" fill="none" stroke="#426f71" stroke-width="2" marker-end="url(#arrow)"/>'+text(490,332,'End, background, route blur, error, or account change → full cleanup.',15,anchor='middle')+text(490,359,'Interrupting a reply clears playback and returns to listening.',15,anchor='middle')
save('voice','Voice session lifecycle','Idle transitions to connection, then listening and speaking. Ending cleans up audio, sockets and timers before returning to idle. Late callbacks must not update a new session.',b)
# Hero botanical/phone artwork.
b='''<circle cx="350" cy="162" r="142" fill="#a0eed8" opacity=".55"/><circle cx="124" cy="268" r="99" fill="#c8baff" opacity=".65"/><circle cx="384" cy="328" r="68" fill="#ffd186" opacity=".7"/>
<path d="M104 339Q181 266 177 77M177 156Q124 155 102 102Q163 92 177 156M180 209Q228 193 247 139Q186 144 180 209M169 266Q111 253 91 203Q151 206 169 266" fill="url(#leaf)" stroke="#138975" stroke-width="3"/>
<g transform="rotate(8 286 208)"><rect x="190" y="35" width="212" height="350" rx="35" fill="#163c3d"/><rect x="198" y="43" width="196" height="334" rx="29" fill="url(#glass)"/><rect x="255" y="52" width="82" height="17" rx="9" fill="#163c3d"/>
<rect x="214" y="99" width="165" height="121" rx="20" fill="#b4f2da"/><path d="M289 201V124M289 167Q247 164 248 133Q283 128 289 167M290 185Q331 171 337 143Q301 143 290 185" fill="url(#leaf)" stroke="#168b72" stroke-width="3"/>
<rect x="214" y="280" width="165" height="47" rx="19" fill="#157c65"/></g>'''
b+=text(236,247,'Kitchen fern',21,weight=750)+text(237,269,'A specimen, a story.',13)+text(264,309,'Save discovery',14,'#fff',700)
b+=rect(31,35,141,59,'url(#glass)')+text(48,59,'01 → 10',20,weight=750)+text(48,80,'Grow your skills',12)
b+=rect(307,335,165,53,'url(#glass)')+text(325,358,'iOS · Android · Web',14,weight=700)+text(325,377,'One thoughtful app.',12)
save('hero','Grow a cross-platform plant companion','An original vector illustration of a leafy fern beside an Expo-style phone showing a saved plant card. Learn progressively across iOS, Android, and web.',b,500,420)
print('Wrote',len(list(OUT.glob('*.svg'))),'original SVG illustrations')
