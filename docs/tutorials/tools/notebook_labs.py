"""Python teaching models embedded into otherwise self-contained lesson notebooks.

These are bounded analogies, not a React or React Native runtime. No live network,
credentials, camera, microphone, or service provisioning is used.
"""
LABS = {
'01': r'''
def runtime(platform='ios', custom_module=False):
    if platform == 'web':
        return 'Use a web adapter; native modules cannot execute in a browser.' if custom_module else 'React Native Web renders DOM in the browser.'
    return 'Use a development build containing the native module.' if custom_module else 'Use matching SDK 57 Expo Go for supported modules.'

def explore_runtime(platform='ios', custom_module=False):
    print(runtime(platform, custom_module))

explore(explore_runtime, platform=['ios', 'android', 'web'], custom_module=False)
assert 'development build' in runtime('ios', True)
assert 'web adapter' in runtime('web', True)
assert 'Expo Go' in runtime('android', False)
print('Model checks passed. These do not test an installed native host.')
''',
'02': r'''
def draw_layout(direction='column', gap=12, width=300):
    # This SVG is a conceptual drawing, not React Native's text/layout engine.
    height = 290 if direction == 'column' else 160
    pieces = []
    for i, (label, color) in enumerate([('Photo', '#a7eed5'), ('Plant name', '#d5c6ff'), ('Action', '#ffd899')]):
        x, y = (20, 28 + i * (52 + gap)) if direction == 'column' else (15 + i * (78 + gap), 45)
        pieces.append(f'<rect x="{x}" y="{y}" width="78" height="48" rx="10" fill="{color}" stroke="#6c8d80"/>')
        pieces.append(f'<text x="{x+7}" y="{y+29}" font-size="11" fill="#173c3d">{label}</text>')
    display(SVG(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">' + ''.join(pieces) + '</svg>'))
    needed = 30 + 3 * 78 + 2 * gap if direction == 'row' else 118
    print(f'Conceptual content width: {needed}px. Available width: {width}px.')
    print('Overflow: choose wrapping or a vertical layout.' if needed > width else 'The drawn boxes fit. Real text still needs font-scale testing.')

explore(draw_layout, direction=['column', 'row'], gap=(0, 32, 4), width=(180, 400, 20))

def card_label(plant):
    return plant['nickname'] + ' · ' + (plant.get('scientificName') or 'Identification uncertain')

assert 'uncertain' in card_label({'id': 'fern_01', 'nickname': 'Kitchen fern'})
assert card_label({'id': 'fern_02', 'nickname': 'Patio fern', 'scientificName': 'Example species'}) == 'Patio fern · Example species'
''',
'03': r'''
from urllib.parse import quote

specimens = [
    {'id': 'fern_kitchen', 'nickname': 'Kitchen fern', 'speciesId': 'same_fern_species'},
    {'id': 'fern_patio', 'nickname': 'Patio fern', 'speciesId': 'same_fern_species'},
]

def specimen_route(identifier):
    if not isinstance(identifier, str) or not identifier.strip():
        raise ValueError('A specimen ID is required')
    return '/plants/' + quote(identifier, safe='')

def explore_route(identifier='fern_kitchen'):
    print('Route file: src/app/plants/[plantId].tsx')
    print('URL:', specimen_route(identifier))
    print('The (tabs) group is not a URL segment.')

explore(explore_route, identifier=[p['id'] for p in specimens])
assert specimens[0]['speciesId'] == specimens[1]['speciesId']
assert specimen_route(specimens[0]['id']) != specimen_route(specimens[1]['id'])
renamed = {**specimens[0], 'nickname': 'The window fern'}
assert specimen_route(renamed['id']) == specimen_route(specimens[0]['id'])
print('Renaming preserves the route. Sharing a species does not merge specimens.')
''',
'04': r'''
def queued_count(initial, functional, updates=2):
    # Bounded analogy for updates queued in ONE event from ONE render snapshot.
    snapshot, result = initial, initial
    for _ in range(updates):
        result = result + 1 if functional else snapshot + 1
    return result

def explore_state(initial=0, functional=False, updates=2):
    print('Render snapshot:', initial)
    print('Queued update strategy:', 'latest queued value' if functional else 'same render snapshot')
    print('Next render count:', queued_count(initial, functional, updates))

explore(explore_state, initial=(0, 8), functional=False, updates=(0, 4))

def rename(items, identifier, nickname):
    return [{**p, 'nickname': nickname} if p['id'] == identifier else p for p in items]

before = [{'id': 'fern_01', 'nickname': 'Kitchen fern'}, {'id': 'fern_02', 'nickname': 'Patio fern'}]
after = rename(before, 'fern_01', 'Window fern')
assert before[0]['nickname'] == 'Kitchen fern'
assert after[0]['id'] == before[0]['id']
assert after is not before and after[0] is not before[0]
assert after[1] is before[1]
assert queued_count(0, False) == 1
assert queued_count(0, True) == 2
print('Snapshot, identity, and immutable-update checks passed.')
''',
'05': r'''
# A deliberately small validator for this notebook's fixture envelope.
# The app uses the richer PlantPage Zod contract.
def inspect_response(status, body):
    if not 200 <= status < 300:
        return 'error', f'HTTP {status}'
    if not isinstance(body, dict) or not isinstance(body.get('items'), list):
        return 'error', 'Invalid response shape'
    if any(not isinstance(p, dict) or not isinstance(p.get('id'), str) or not p['id'] or not isinstance(p.get('nickname'), str) for p in body['items']):
        return 'error', 'Invalid specimen shape'
    return ('success', body['items']) if body['items'] else ('empty', [])

fixtures = {
    'success': (200, {'items': [{'id': 'fern_01', 'nickname': 'Kitchen fern'}]}),
    'empty': (200, {'items': []}),
    'unauthorized': (401, {'code': 'unauthorized'}),
    'unavailable': (503, {'code': 'unavailable'}),
    'malformed': (200, {'items': [{'name': 'missing fields'}]}),
}

def explore_response(scenario='success', owner='learner_a'):
    print('queryKey:', [owner, 'plants'])
    print('Fixture result:', inspect_response(*fixtures[scenario]))
    print('The identity in a cache key is not server authorization.')

explore(explore_response, scenario=list(fixtures), owner=['learner_a', 'learner_b'])
assert inspect_response(*fixtures['empty'])[0] == 'empty'
assert inspect_response(*fixtures['malformed'])[0] == 'error'
assert inspect_response(*fixtures['unauthorized'])[0] == 'error'
assert inspect_response(*fixtures['success'])[0] == 'success'
''',
'06': r'''
# No real credentials or token decoding appear in this notebook.
def may_read(verified_identity, record_owner):
    return bool(verified_identity and verified_identity == record_owner)

def location_for(name):
    public = {'api_url', 'clerk_publishable_key'}
    server = {'provider_secret', 'firebase_admin_credentials'}
    if name in public:
        return 'public app configuration'
    if name in server:
        return 'server environment'
    raise ValueError('Unclassified value; inspect its intended trust boundary')

def explore_boundary(identity='learner_a', owner='learner_a', value='api_url'):
    print('Ownership decision:', 'allow' if may_read(identity, owner) else 'deny')
    print('Configuration location:', location_for(value))
    print('The server must establish verified_identity. Never trust a client-supplied owner.')

explore(explore_boundary, identity=['learner_a', 'learner_b', ''], owner=['learner_a', 'learner_b'], value=['api_url', 'clerk_publishable_key', 'provider_secret', 'firebase_admin_credentials'])
assert may_read('learner_a', 'learner_a')
assert not may_read('learner_b', 'learner_a')
assert not may_read('', '')
assert location_for('provider_secret') == 'server environment'
''',
'07': r'''
def capture_action(permission='unknown', ready=False, selected=False, retained=False):
    if selected and retained:
        return 'Persist the draft, then prepare a separate upload derivative.'
    if selected:
        return 'Retain the original; a temporary URI is not durable evidence.'
    if permission == 'denied':
        return 'Explain the denial and offer a library path.'
    if permission != 'granted':
        return 'Ask for permission after the person chooses to use the camera.'
    if not ready:
        return 'Wait for onCameraReady before enabling capture.'
    return 'Enable capture; guard against a second in-flight shot.'

def explore_capture(permission='unknown', ready=False, selected=False, retained=False):
    print(capture_action(permission, ready, selected, retained))
    print('No camera is opened. This is a state decision model.')

explore(explore_capture, permission=['unknown', 'denied', 'granted'], ready=False, selected=False, retained=False)
assert 'Wait' in capture_action('granted', False)
assert 'library' in capture_action('denied')
assert 'Retain' in capture_action('granted', True, True, False)
assert 'separate' in capture_action('granted', True, True, True)
''',
'08': r'''
import sqlite3
from contextlib import closing
from pathlib import Path
from tempfile import TemporaryDirectory

# Real SQLite write and reopen, in a disposable local folder. No cloud service.
# This models metadata durability, not camera files or expo-sqlite itself.
with TemporaryDirectory(prefix='plantopedia-course-') as folder:
    path = Path(folder) / 'drafts.db'
    # A Connection context manager commits/rolls back; closing also closes its file.
    with closing(sqlite3.connect(path)) as db:
        with db:
            db.execute('CREATE TABLE drafts (owner TEXT, id TEXT, stage TEXT, PRIMARY KEY(owner, id))')
            db.execute('INSERT INTO drafts VALUES (?, ?, ?)', ('learner_a', 'fern_01', 'draft'))
    # The first connection is committed AND closed before a separate connection opens.
    with closing(sqlite3.connect(path)) as reopened:
        row = reopened.execute('SELECT stage FROM drafts WHERE owner = ? AND id = ?', ('learner_a', 'fern_01')).fetchone()
        other = reopened.execute('SELECT stage FROM drafts WHERE owner = ?', ('learner_b',)).fetchone()
    assert row == ('draft',) and other is None
    # Verify cleanup before TemporaryDirectory attempts removal, including on Windows.
    for connection in (db, reopened):
        try:
            connection.execute('SELECT 1')
        except sqlite3.ProgrammingError:
            pass  # The expected result for an explicitly closed connection.
        else:
            raise AssertionError('Close the database connection before deleting its folder')
print('A committed metadata draft survived reopening; another owner did not retrieve it.')

def retry_model(lose_first_ack=True, change_owner=False):
    accepted, checkpoint, trace = set(), 'draft', []
    for attempt in range(1, 3):
        if change_owner:
            trace.append('STOP: account changed before sending.'); break
        key = 'plant_fern_01'  # stable across BOTH attempts
        existed = key in accepted
        accepted.add(key)
        trace.append(f'Attempt {attempt}: ' + ('reuse prior result' if existed else 'accept one write'))
        if attempt == 1 and lose_first_ack:
            trace.append('Response lost. Keep draft checkpoint.'); continue
        checkpoint = 'plant'
        break
    return len(accepted), checkpoint, trace

def explore_retry(lose_first_ack=True, change_owner=False):
    writes, checkpoint, trace = retry_model(lose_first_ack, change_owner)
    print('\n'.join(trace)); print('Distinct writes:', writes, '| checkpoint:', checkpoint)

explore(explore_retry, lose_first_ack=True, change_owner=False)
assert retry_model(True, False)[:2] == (1, 'plant')
assert retry_model(False, False)[:2] == (1, 'plant')
assert retry_model(True, True)[:2] == (0, 'draft')
''',
'09': r'''
def surface(platform='ios', supported=False, reduce_transparency=False):
    if platform == 'ios' and supported and not reduce_transparency:
        return 'Native glass after both API and OS checks'
    return 'Opaque accessible fallback'

def explore_platform(platform='ios', supported=False, reduce_transparency=False, language='en'):
    print(surface(platform, supported, reduce_transparency))
    labels = {'en': 'Save discovery', 'de': 'Entdeckung speichern', 'ja': '発見を保存'}
    print('Label:', labels[language]); print('Allow wrapping and test actual font scaling.')
    print('Web CSS blur is a separate adapter, not native glass.')

explore(explore_platform, platform=['ios', 'android', 'web'], supported=False, reduce_transparency=False, language=['en', 'de', 'ja'])

class VoiceModel:
    def __init__(self):
        self.generation = 0; self.phase = 'idle'; self.resources = set()
    def start(self):
        self.end()
        self.phase = 'connecting'; self.resources = {'socket', 'timer', 'microphone'}
        return self.generation
    def receive(self, generation):
        if generation != self.generation or self.phase == 'idle':
            return 'ignored stale callback'
        self.phase = 'ready'; return 'current session ready'
    def end(self):
        self.generation += 1; self.phase = 'idle'; self.resources.clear()

v = VoiceModel(); first = v.start(); v.end(); second = v.start()
assert v.receive(first) == 'ignored stale callback'
assert v.receive(second) == 'current session ready'
v.end()
assert not v.resources and v.phase == 'idle'
assert surface('ios', True, True) == 'Opaque accessible fallback'
print('Lifecycle model checks passed. Real microphone release still needs device acceptance.')
''',
'10': r'''
# Mutation exercise: prove the test rejects an implementation that violates its claim.
def rename_copy(plant, nickname):
    return {**plant, 'nickname': nickname}

def rename_bug(plant, nickname):
    plant['nickname'] = nickname
    return plant

def unchanged_snapshot_check(implementation):
    before = {'id': 'fern_01', 'nickname': 'Kitchen fern'}
    after = implementation(before, 'Window fern')
    assert before['nickname'] == 'Kitchen fern', 'The old state was mutated'
    assert after['id'] == 'fern_01', 'Identity changed during rename'
    assert after['nickname'] == 'Window fern', 'The requested change did not happen'
    assert before is not after, 'No new state object was returned'

unchanged_snapshot_check(rename_copy)
try:
    unchanged_snapshot_check(rename_bug)
except AssertionError as error:
    print('The test caught the deliberate defect:', error)
else:
    raise AssertionError('A broken implementation escaped the check')

evidence = {
    'rename preserves ID': 'logic',
    'retry button is usable': 'component',
    'other owner is rejected': 'api',
    'real camera permission recovery': 'device',
    'native microphone is released': 'device',
}

def explore_evidence(claim='rename preserves ID'):
    print('Claim:', claim); print('Required evidence:', evidence[claim])
    print('A passing model test does not certify native hardware or a release build.')

explore(explore_evidence, claim=list(evidence))
'''
}
PRACTICE = {
'01': ('Which host can contain the custom native voice module on iOS?', "your_answer = None  # Replace with 'development build', then rerun this cell.", "your_answer == 'development build'", "A development build compiles the custom module into the native app. Expo Go cannot gain it through a JavaScript reload."),
'02': ('Write the main-axis direction for the React Native default.', "your_answer = None  # Replace with 'column' or 'row'.", "your_answer == 'column'", "The React Native default is column. The main axis therefore runs from top to bottom."),
'03': ('Create routes for the two fixtures without using their common species ID.', "your_answer = None  # Replace with [specimen_route(p['id']) for p in specimens].", "your_answer == ['/plants/fern_kitchen', '/plants/fern_patio']", "Each specimen keeps its own route even when both specimens share a species."),
'04': ('Predict the count after THREE functional updates starting at 2.', "your_answer = None  # Replace with a number, then check your prediction with queued_count.", "your_answer == 5", "Each updater receives the previous queued result: 2 → 3 → 4 → 5."),
'05': ('Classify a successful HTTP response whose records have no IDs.', "your_answer = None  # Replace with inspect_response(200, {'items': [{'nickname': 'Fern'}]})[0].", "your_answer == 'error'", "Successful transport does not validate JSON. Reject the malformed record before caching it."),
'06': ('Can verified Learner B read a record owned by Learner A?', "your_answer = None  # Replace with may_read('learner_b', 'learner_a').", "your_answer is False", "The verified caller and record owner differ, so the server must reject the request."),
'07': ('What is still missing when permission is granted but the camera is not ready?', "your_answer = None  # Replace with 'onCameraReady' after predicting the next transition.", "your_answer == 'onCameraReady'", "Wait for readiness independently of permission. A permission grant does not prove the camera is initialized."),
'08': ('Predict distinct writes after the first acknowledgment is lost and the same key is retried.', "your_answer = None  # Replace with retry_model(True, False)[0].", "your_answer == 1", "The fixture server remembers the stable operation key. It returns the existing result instead of creating a duplicate."),
'09': ('Should supported iOS glass be used when reduced transparency is requested?', "your_answer = None  # Replace with surface('ios', True, True).", "your_answer == 'Opaque accessible fallback'", "The accessibility preference takes precedence over the decorative effect."),
'10': ('Which evidence can prove actual native microphone release?', "your_answer = None  # Replace with 'logic', 'component', 'api', or 'device'.", "your_answer == 'device'", "A device run verifies the hardware boundary. Model and component tests remain useful complementary checks.")
}

# These directions describe the Python controls below, rather than borrowing the
# broader browser-lab task. Editing an explorer's default arguments also works
# when optional widgets are unavailable.
NOTEBOOK_EXPERIMENTS = {
    '01': "Choose iOS, Android, or web, and toggle the custom-module flag. Predict the required host before reading the printed explanation. The default is iOS without a custom module. Compare a supported Expo Go preview with a development build that contains the native voice module. This model prints a decision; it does not install or launch either host.",
    '02': "Choose column or row, then vary the gap and available width. Before changing a control, predict whether the three conceptual boxes will fit. Defaults are column, a 12-pixel gap, and 300 pixels of width. The drawing uses fixed boxes and does not measure font size or real text wrapping. Use the browser lab and Expo exercise for richer card behavior, then test font scaling on a device.",
    '03': "Choose each fixture specimen ID and compare the printed route with the common species ID in the data. The default is fern_kitchen. Read the rename assertions and explain why the route stays the same after a nickname changes. This dropdown has no navigation history or Back button; the browser lab and Expo Router exercise add those behaviors.",
    '04': "Set an initial count, choose replacement or functional updates, and choose how many updates are queued in one event. Defaults are 0, replacement updates, and two updates. Predict the printed next count before changing the controls. Then edit the rename example and inspect the assertions about the previous list and unchanged neighbor. This model explains a bounded state transition; React itself is not running.",
    '05': "Choose a fixture response scenario and an owner. Predict whether the classifier returns success, empty, or error, and compare the printed query key. Defaults are success and learner_a. This notebook classifies one response at a time; it does not retain a query cache or model a failed background refresh. Use the browser network lab or Expo Query exercise to explore cached data during refresh failures.",
    '06': "Choose a verified identity, a record owner, and a configuration value. Predict both the ownership decision and whether the value belongs in public app configuration or the server environment. Defaults are learner_a, learner_a, and api_url. This model assumes the identity was verified elsewhere; it neither validates a token nor classifies malformed API JSON. Response-shape validation is practiced in notebook 05.",
    '07': "Change permission, readiness, selected-photo, and retained-original flags one at a time. Predict the next action printed by the decision function. Defaults are unknown permission with all three flags false. A selected library photo can exist without camera permission. This model stops at deciding to prepare a derivative; it does not inject preparation failures or copy files. Trace those failures in the course text and test recovery with the Expo capture exercise.",
    '08': "First run the SQLite write/close/reopen check and explain what the second connection can retrieve for each owner. Then toggle lost acknowledgement and account change. Defaults lose the first acknowledgement while keeping the original owner. The retry model attempts only plant creation, at most twice, and prints its trace; it does not advance the full observation/photo pipeline. Predict the distinct-write count and confirmed checkpoint before changing a flag, then use the browser outbox lab for the longer sequence.",
    '09': "Choose a platform, support flag, transparency preference, and example language to inspect the surface decision and label. Defaults are iOS, unsupported glass, normal transparency, and English. The voice example below is a separate editable sequence: change the start/end/receive calls, save each returned generation, and predict which callback is ignored. It has no interruption or audio controls. Use the browser session model and a real-device run for those additional boundaries.",
    '10': "Read the mutation check, predict which assertion catches rename_bug, then run it. Choose an evidence claim to inspect the smallest useful check; the default is rename preserves ID. Add another claim to the evidence dictionary and explain the remaining boundary. The fixture test can reject an old-state mutation, but it cannot substantiate actual camera or microphone behavior.",
}
