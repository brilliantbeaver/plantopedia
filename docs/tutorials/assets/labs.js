/* Every lab uses ordinary browser DOM. Native hardware and React are not executed here. */
(function () {
  'use strict';
  const M = window.CourseModels;
  const e = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const code = s => `<pre>${e(s)}</pre>`;
  const status = (s, warn = false) => `<div class="lab-status${warn ? ' warn' : ''}" role="status">${s}</div>`;
  let dispose = () => {};
  const boundary = 'This is a browser teaching model with explicit fixture data. It does not run React Native, call the Plantopedia API, store real drafts, or access a camera or microphone.';
  const controls = (left, right) => `<div class="lab-grid"><div class="lab-controls">${left}</div><div class="lab-output" id="lab-output">${right || ''}</div></div>`;
  function mount(host, definition) {
    dispose(); dispose = () => {};
    const kind = definition.kind;
    host.innerHTML = `<div class="lab-tag">PLAY → OBSERVE → EXPLAIN</div><h2>${e(definition.title)}</h2><p class="lab-intro">${e(definition.instructions)}</p><div id="lab-content"></div><p class="lab-boundary">${boundary}</p>`;
    const area = host.querySelector('#lab-content');
    const q = sel => area.querySelector(sel);
    const on = (sel, event, fn) => q(sel).addEventListener(event, fn);
    const output = s => { q('#lab-output').innerHTML = s; };
    const select = (id, title, values) => `<label for="${id}">${title}<select id="${id}">${values.map(([v,t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>`;
    const check = (id, title) => `<label class="control-check"><input id="${id}" type="checkbox"><span>${title}</span></label>`;
    if (kind === 'runtime') {
      area.innerHTML = controls(select('runtime-platform','Render target',[['ios','iOS'],['android','Android'],['web','Web browser']]) + check('runtime-custom','Require a custom native module, like PlantopediaVoice') + '<button id="trace-runtime" class="primary">Trace the render path</button>');
      function update() { const r = M.runtime(q('#runtime-platform').value,q('#runtime-custom').checked); output(`<h3>${e(r.host)}</h3><div class="step-row"><span class="step-chip">JSX description</span><span aria-hidden="true">→</span><span class="step-chip active">${e(r.renderer)}</span></div>${status(e(r.reason), !r.available)}${code('export function Greeting() {\n  return <Text>Hello, plant explorer.</Text>;\n}')}`); }
      on('#trace-runtime','click',update);on('#runtime-platform','change',update);on('#runtime-custom','change',update);update();
    } else if (kind === 'layout') {
      area.innerHTML = controls(select('layout-direction','Main axis',[['column','Column · top to bottom (RN default)'],['row','Row · left to right']]) + '<label for="layout-gap">Sibling gap: <output id="gap-value">12</output><input id="layout-gap" type="range" min="0" max="32" value="12"></label><label for="layout-width">Preview width: <output id="width-value">280</output> px<input id="layout-width" type="range" min="180" max="340" value="280"></label><label for="layout-font">Text size: <output id="font-value">18</output> px<input id="layout-font" type="range" min="14" max="32" value="18"></label>');
      function update() {
        const gap=Number(q('#layout-gap').value),width=Number(q('#layout-width').value),font=Number(q('#layout-font').value),d=q('#layout-direction').value;
        q('#gap-value').value=gap;q('#width-value').value=width;q('#font-value').value=font;
        output(`<div class="plant-preview" style="flex-direction:${d};gap:${gap}px;width:${width}px;max-width:100%;align-items:${d==='row'?'center':'stretch'}"><div class="plant-leaf" aria-hidden="true"></div><div style="flex:1;min-width:0;font-size:${font}px;overflow-wrap:anywhere"><strong>A very well-loved kitchen fern</strong><div class="small">Specimen fern_01</div></div></div>${code(`{ flexDirection: '${d}', gap: ${gap},\n  padding: 14, width: ${width} }\n// Text style: { fontSize: ${font} }`)}${status('The preview uses HTML flex layout. The leaf keeps its width while the text wraps. React Native font scaling, safe areas, and platform text layout still need device checks.')}`);
      }
      ['#layout-direction','#layout-gap','#layout-width','#layout-font'].forEach(sel=>on(sel,'input',update));update();
    } else if (kind === 'navigation') {
      let history=['/plants'];
      area.innerHTML=controls(select('route-specimen','Choose a specimen',[['fern_kitchen','Kitchen fern · fern_kitchen'],['fern_patio','Patio fern · fern_patio']])+'<div class="button-row"><button id="route-push" class="primary">Open specimen</button><button id="route-back">Back</button></div><button id="route-reset">Reset history</button>');
      function update(){q('#route-back').disabled=history.length<=1;const current=history[history.length-1];output(`<h3>Current URL</h3>${code(current)}<p>Both ferns can share a species name. Their records stay separate because their specimen IDs differ.</p><div class="lab-log">${history.map((x,i)=>`${i+1}. ${e(x)}`).join('\n')}</div>${status('Route file: src/app/plants/[plantId].tsx. The (tabs) folder is an organizing group and is absent from the URL.')}`);}
      on('#route-push','click',()=>{history.push(M.route(q('#route-specimen').value));update();});on('#route-back','click',()=>{if(history.length>1)history.pop();update();});on('#route-reset','click',()=>{history=['/plants'];update();});update();
    } else if (kind === 'state') {
      let count=0,plants=[{id:'fern_01',nickname:'Kitchen fern',favorite:false},{id:'fern_02',nickname:'Patio fern',favorite:false}],transition='';
      area.innerHTML=controls(select('state-strategy','Two updates in the same event',[['snapshot','setCount(count + 1), twice'],['functional','setCount(n => n + 1), twice']])+'<button id="state-tap" class="primary">Queue two updates</button><button id="state-reset">Reset count</button><label for="state-name">New kitchen fern nickname<input id="state-name" type="text" value="Window fern" maxlength="120"></label><button id="state-rename">Rename kitchen fern</button><button id="state-favorite">Toggle kitchen fern favorite</button>');
      function update(old) {
        const strategy=q('#state-strategy').value;
        output(`<h3>Rendered count</h3><div class="metric">${count}</div>${old!==undefined?status(`This event started with ${old}. ${strategy==='snapshot'?'Both replacement updates read that same snapshot, so the result is '+count+'.':'Each updater received the previous queued result, so the result is '+count+'.'}`):'<p>Predict the result before you press the button.</p>'}${code(JSON.stringify(plants,null,2))}${transition?status(e(transition)):''}<p class="small">Rename and favorite transitions use the stable specimen ID. A changed record receives a new object, while the neighbor keeps its original reference.</p>`);
      }
      function change(action) {
        const before=plants,previous=JSON.stringify(before),oldName=before[0].nickname;
        try {
          plants=action(before);
          transition=`Previous kitchen nickname: “${oldName}”. New array: ${plants!==before}. Changed object: ${plants[0]!==before[0]}. Neighbor reused: ${plants[1]===before[1]}. Previous array unchanged: ${JSON.stringify(before)===previous}.`;
        } catch(error) { transition=error.message; }
        update();
      }
      on('#state-tap','click',()=>{const old=count;count=M.state(count,q('#state-strategy').value,2);update(old);});
      on('#state-reset','click',()=>{count=0;update();});on('#state-strategy','change',()=>update());
      on('#state-favorite','click',()=>change(items=>M.toggle(items,'fern_01')));
      on('#state-rename','click',()=>change(items=>M.rename(items,'fern_01',q('#state-name').value)));update();
    } else if (kind === 'network') {
      let timer,state=M.newNetwork(),notice='No request yet. Predict how each status differs from an empty list.';
      const cases={success:[200,{items:[{id:'fern_01',nickname:'Kitchen fern'}]}],empty:[200,{items:[]}],unauthorized:[401,{code:'unauthorized'}],server:[503,{code:'unavailable'}],malformed:[200,{items:[{name:'missing ID'}]}]};
      area.innerHTML=controls(select('network-case','Response scenario',[['success','200 · valid teaching summaries'],['empty','200 · empty collection'],['unauthorized','401 · token rejected'],['server','503 · API unavailable'],['malformed','200 · invalid summary shape']])+select('network-owner','Active account',[['learner_a','Learner A'],['learner_b','Learner B']])+'<div class="button-row"><button id="network-send" class="primary">Send fixture request</button><button id="network-cancel" disabled>Cancel</button></div><button id="network-clear">Clear teaching cache</button>');
      function update() {
        q('#network-cancel').disabled=!state.pending;q('#network-send').disabled=state.pending;
        const data=Object.hasOwn(state.cache,state.owner)?state.cache[state.owner]:null;
        const result=state.result;
        let heading=state.pending?(data?'Checking for updates…':'Loading…'):result?.kind==='error'?(data?'Update failed; showing last known data':'Request failed'):data?(data.items.length?'Success':'Empty collection'):'Ready';
        let records=data?(data.items.length?`<ul class="network-records">${data.items.map(item=>`<li><strong>${e(item.nickname)}</strong> <span class="small">${e(item.id)}</span></li>`).join('')}</ul>`:'<p class="network-records">The last successful response was an empty collection.</p>'):'<p>No validated records are available for this account yet.</p>';
        output(`<h3>${heading}</h3><h4>Query key</h4>${code(JSON.stringify(M.key(state.owner)))}${records}${status(e(state.pending?'Waiting for a deterministic fixture response. Try Cancel or switch accounts.':result?.message||notice),result?.kind==='error')}${result?.kind==='error'&&data?'<p>The refresh failed. The prior successful data is still visible; the failure does not prove it disappeared.</p>':''}<p class="small">This lab validates a smaller TeachingSummaryPage: an items array with valid id and nonempty nickname strings. It does not implement full PlantPage.parse or a real Query cache. Only successful validated summaries enter this owner-scoped fixture cache. A 401 needs authentication handling.</p>`);
      }
      function cancel() {clearTimeout(timer);state=M.cancelNetwork(state);}
      on('#network-send','click',()=>{
        clearTimeout(timer);state=M.beginNetwork(state);
        const generation=state.generation,owner=state.owner,scenario=q('#network-case').value;update();
        timer=setTimeout(()=>{const [http,body]=cases[scenario];state=M.resolveNetwork(state,owner,generation,http,body);update();},700);
      });
      on('#network-cancel','click',()=>{cancel();notice='Cancelled. A late result cannot update this view.';update();});
      on('#network-owner','change',()=>{clearTimeout(timer);state=M.changeNetworkOwner(state,q('#network-owner').value);notice='Account changed. Only this owner’s cache entry is rendered.';update();});
      on('#network-clear','click',()=>{cancel();state={...state,cache:{}};notice='Teaching cache cleared.';update();});
      dispose=()=>{clearTimeout(timer);state=M.cancelNetwork(state);};update();
    } else if (kind === 'security') {
      const choices=[['EXPO_PUBLIC_API_BASE_URL','public','A public service address must be bundled so the app can call it.'],['Clerk publishable key','public','This key identifies the Clerk application. It is deliberately publishable.'],['Provider secret API key','server','A provider secret belongs on the server. Public environment variables are visible in the shipped bundle.'],['Firebase Admin credentials','server','Admin credentials bypass client rules and must remain on the server.']];let index=0;
      area.innerHTML=controls('<p>Decide where this value belongs. No real values are shown.</p><div id="secret-card" class="callout"></div><div class="button-row"><button id="secret-public">Public app configuration</button><button id="secret-server">Server environment</button></div><button id="secret-next">Next value</button>'+select('security-identity','Verified server identity',[['learner_a','Learner A'],['learner_b','Learner B'],['','No valid identity']])+select('security-owner','Requested record owner',[['learner_a','Learner A'],['learner_b','Learner B']]));
      let answer='Choose a location for the value, then change the identity and record owner.';
      function update(){const c=choices[index];q('#secret-card').textContent=c[0];output(`<h3>Trust-boundary decision</h3>${status(e(answer))}<h3 style="margin-top:20px">Server ownership check</h3>${status(M.mayRead(q('#security-identity').value,q('#security-owner').value)?'Allow in this model: verified identity matches record owner.':'Deny in this model: identity is absent or does not match owner.',!M.mayRead(q('#security-identity').value,q('#security-owner').value))}<p class="small">The server derives identity from a verified token. A client cannot authorize itself by changing a query key or passing a user ID.</p>`);}
      function choose(location){const c=choices[index];answer=(c[1]===location?'Correct. ':'Try that decision again. ')+c[2];update();}
      on('#secret-public','click',()=>choose('public'));on('#secret-server','click',()=>choose('server'));on('#secret-next','click',()=>{index=(index+1)%choices.length;answer='Choose a location for this value.';update();});['#security-identity','#security-owner'].forEach(x=>on(x,'change',update));update();
    } else if (kind === 'camera') {
      let state=M.newCamera();
      area.innerHTML=controls('<div class="button-row"><button id="camera-grant">Grant permission</button><button id="camera-deny">Deny permission</button></div><button id="camera-ready">Camera becomes ready</button><button id="camera-capture" class="primary">Take fixture photo</button><button id="camera-library">Choose fixture library photo</button><button id="camera-retain">Retain durable original</button><button id="camera-persist">Persist draft</button>'+check('camera-fail','Force preparation failure')+'<button id="camera-prepare">Prepare derivative / retry</button><button id="camera-reset">Reset workflow</button>');
      function update(message) {
        q('#camera-ready').disabled=state.permission!=='granted'||state.ready;
        q('#camera-capture').disabled=state.permission!=='granted'||!state.ready;
        q('#camera-retain').disabled=!state.photo||state.retained;
        q('#camera-persist').disabled=!state.retained||state.draftSaved;
        q('#camera-prepare').disabled=!state.retained||!state.draftSaved||state.derivative;
        const steps=['permission: '+state.permission,'camera: '+(state.ready?'ready':'not ready'),'photo: '+(state.photo?'selected':'none'),'original: '+(state.retained?'retained':'not retained'),'draft: '+(state.draftSaved?'persisted':'not saved'),'derivative: '+(state.derivative?'prepared':'not prepared')];
        output(`<h3>Capture state</h3><div class="step-row">${steps.map(text=>`<span class="step-chip">${e(text)}</span>`).join('')}</div>${status(e(state.error||message||'Permission and readiness are separate. Capture or choose a photo, retain its original, persist its draft, then prepare a derivative.'),Boolean(state.error)||state.permission==='denied')}<p>Try a preparation failure after saving the draft. The original and draft stay present. Uncheck the failure control and retry the same preparation.</p><p class="small">These flags simulate the sequence. Real native storage copies bytes and saves a validated draft; this browser lab writes no photos or durable records.</p>`);
      }
      const messages={grant:'Permission granted. Wait for onCameraReady.',deny:'Permission denied. A library path remains available.',ready:'Camera ready. Capture is available.',capture:'Temporary photo selected. Retain its original.',library:'Library photo selected without camera permission.',retain:'Original retained in this model. Persist the draft next.',persist:'Draft persisted in this model. You can prepare a separate derivative.',prepare:'Derivative prepared. Upload remains a separate operation.'};
      for(const [selector,action] of [['#camera-grant','grant'],['#camera-deny','deny'],['#camera-ready','ready'],['#camera-capture','capture'],['#camera-library','library'],['#camera-retain','retain'],['#camera-persist','persist']])on(selector,'click',()=>{state=M.cameraStep(state,action);update(messages[action]);});
      on('#camera-prepare','click',()=>{state=M.cameraStep(state,q('#camera-fail').checked?'failPrepare':'prepare');update(messages.prepare);});
      on('#camera-reset','click',()=>{state=M.newCamera();q('#camera-fail').checked=false;update();});update();
    } else if (kind === 'outbox') {
      let s=M.newOutbox();
      area.innerHTML=controls(check('outbox-lost','Lose the acknowledgment after the server accepts this step')+check('outbox-account','Switch to Learner B before the next step')+check('outbox-deleted','Server reports the specimen deleted')+'<button id="outbox-step" class="primary">Attempt next operation</button><button id="outbox-reset">Reset draft and fixture server</button>');
      function update(){output(`<h3>Local checkpoint vs. server writes</h3><div class="step-row">${['draft','plant','observation','complete'].map((x,i)=>`<span class="step-chip ${i===s.checkpoint?'active':''}">${x}</span>`).join('')}</div><p><strong>${s.accepted.length}</strong> distinct accepted writes · <strong>${s.attempts}</strong> request attempts.</p>${code(`draft.owner = '${s.owner}'\nactiveOwner = '${s.activeOwner}'\nid = '${s.id}'`)}<div class="lab-log" role="log" aria-label="Outbox operation history">${e(s.log.join('\n')||'No attempt yet. Lose an acknowledgment, then retry with the box unchecked.')}</div><p class="small">The production flow also has a persisted photo checkpoint before complete. This lab combines the photo acknowledgment and completion in one step. The fixture server remembers operation keys only for this experiment.</p>`);}
      on('#outbox-step','click',()=>{s.activeOwner=q('#outbox-account').checked?'learner_b':'learner_a';s.deleted=q('#outbox-deleted').checked;s=M.outboxStep(s,q('#outbox-lost').checked);update();});on('#outbox-reset','click',()=>{s=M.newOutbox();['#outbox-lost','#outbox-account','#outbox-deleted'].forEach(x=>q(x).checked=false);update();});update();
    } else if (kind === 'voice') {
      let state=M.newVoice(),callbackGeneration=null,previousGeneration=null;
      area.innerHTML=controls(select('voice-platform','Glass platform',[['ios','iOS'],['android','Android'],['web','Web']])+check('glass-support','The native glass API and OS are supported')+check('glass-reduce','Reduce transparency is enabled')+select('voice-language','Example label',[['en','English'],['de','German'],['ja','Japanese']])+'<div class="button-row"><button id="voice-start" class="primary">Start session model</button><button id="voice-ready">Deliver current connected callback</button><button id="voice-end">End & clean up</button></div><button id="voice-play">Receive reply audio</button><button id="voice-interrupt">Interrupt reply</button><button id="voice-late">Deliver an old session callback</button>');
      function update(message) {
        const labels={en:'Save discovery',de:'Entdeckung speichern',ja:'発見を保存'};
        q('#voice-start').disabled=state.phase!=='idle';q('#voice-ready').disabled=state.phase!=='connecting';q('#voice-end').disabled=state.phase==='idle';
        q('#voice-play').disabled=!['listening','speaking'].includes(state.phase);q('#voice-interrupt').disabled=!state.playing;q('#voice-late').disabled=previousGeneration===null;
        output(`<h3>Adaptive surface</h3>${status(e(M.glass(q('#voice-platform').value,q('#glass-support').checked,q('#glass-reduce').checked)))}<div class="plant-preview" style="margin-top:14px;min-height:48px;justify-content:center">${e(labels[q('#voice-language').value])}</div><p class="small">Allow the label to wrap. Translation length is not fixed.</p><h3>Voice resources</h3>${code(`phase = '${state.phase}'\ngeneration = ${state.generation}\nplaying reply = ${state.playing}\nopen sockets = ${state.phase==='idle'?0:1}\naccepted current callbacks = ${state.accepted}\nignored stale callbacks = ${state.stale}\nold callback generation = ${previousGeneration??'none captured yet'}`)}${status(e(message||'Start captures a callback generation. Connect, End, start again, and deliver the retained old callback.'))}<p class="small">End closes simulated resources. Reply interruption only clears playback and returns to listening. The real web adapter can use CSS blur; this conservative surface model uses opaque web surfaces. No audio is recorded.</p>`);
      }
      on('#voice-start','click',()=>{if(callbackGeneration!==null)previousGeneration=callbackGeneration;state=M.voiceStep(state,'start');callbackGeneration=state.generation;update('Started a new generation. Its simulated callback carries this generation number.');});
      on('#voice-ready','click',()=>{state=M.voiceStep(state,'callback',callbackGeneration);update('Accepted: the callback generation matches the current live session.');});
      on('#voice-end','click',()=>{previousGeneration=callbackGeneration;state=M.voiceStep(state,'end');update('Ended: generation advanced and simulated resources closed. The retained callback is now stale.');});
      on('#voice-play','click',()=>{state=M.voiceStep(state,'playback',callbackGeneration);update('Current-session reply audio accepted. Playback is active.');});
      on('#voice-interrupt','click',()=>{state=M.voiceStep(state,'interrupt');update('Reply interrupted. Pending reply playback is cleared; the session keeps listening.');});
      on('#voice-late','click',()=>{state=M.voiceStep(state,'callback',previousGeneration);update(`Ignored callback from generation ${previousGeneration}; current generation is ${state.generation}. The current session stays unchanged.`);});
      ['#voice-platform','#glass-support','#glass-reduce','#voice-language'].forEach(sel=>on(sel,'change',()=>update()));update();
    } else if (kind === 'quality') {
      const scenarios=[['Rename keeps the specimen ID','logic','A pure function test can verify that renaming preserves identity and leaves the original object untouched.'],['A failed request shows a retry action','component','A component test can render the failure and press Retry. It should observe visible behavior.'],['A token cannot read another owner’s record','api','An API integration test can send authenticated requests for different owners and assert rejection.'],['The real camera recovers after permission denial','device','A real device acceptance run is needed. A mocked camera cannot prove OS permission behavior.'],['Native voice stops recording after leaving a screen','device','Real audio acceptance is required alongside lifecycle unit tests. JavaScript mocks cannot prove microphone release.']];let index=0,feedback='Choose the smallest useful check that actually supports the claim.';
      area.innerHTML=controls('<div class="callout" id="quality-case"></div>'+select('quality-check','Evidence you would collect',[['logic','Pure-logic test'],['component','Component behavior test'],['api','API integration test'],['device','Real-device acceptance']])+'<button id="quality-answer" class="primary">Check my reasoning</button><button id="quality-next">Next scenario</button>');
      function update(){q('#quality-case').textContent=scenarios[index][0];output(`<h3>What does this evidence prove?</h3>${status(e(feedback))}<p>A passing check supports a specific claim. Add complementary checks when the feature crosses several boundaries.</p>${code('npm run typecheck\nnpm run test:unit\nnpm run test:functional\nnpm run test:components')}<p class="small">Run these in the application repository after its documented setup. Course model tests use their own separate command.</p>`);}
      on('#quality-answer','click',()=>{const s=scenarios[index];feedback=(s[1]===q('#quality-check').value?'Correct. ':'That check does not fully support this particular claim. ')+s[2];update();});on('#quality-next','click',()=>{index=(index+1)%scenarios.length;feedback='Choose the smallest useful check that supports this claim.';update();});update();
    } else { area.innerHTML='<p>This lesson’s practical experiment is in the downloadable exercise workbook.</p>'; }
  }
  window.CourseLabs = { mount, cleanup: () => { dispose();dispose=()=>{}; } };
})();
