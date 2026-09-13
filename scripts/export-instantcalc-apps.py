#!/usr/bin/env python3
"""Export this frozen 16-app cohort from Git blobs; stdlib only, no builds.

--source-root points to the experiment root containing apps/<model>/<arm>/r01.
--check without sources checks the public export; with sources also regenerates
everything in memory and compares bytes. Unknown storage/path forms fail closed.
"""
import argparse
import hashlib
import html
import json
import posixpath
import re
import subprocess
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'docs/instantcalc'
OUT = PUBLIC / 'apps'
TEXT = {'.html', '.js', '.mjs', '.css', '.svg'}
ASSETS = {'.svg', '.png', '.webp', '.ico', '.jpg', '.jpeg'}
PRIVATE = re.compile(r'/(?:Users|private|root)/|\.AI/|thread_id|response_ids?|resp_[a-z0-9]|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|(?:localhost|127\.0\.0\.1)|(?:api[_-]?key|access[_-]?token)\s*[:=]', re.I)
ATTR = re.compile(r'\b(?:href|src)\s*=\s*([\'"])(.*?)\1', re.S)
IMPORT = re.compile(r'\b(?:import|export)\s+(?:[^;]*?\bfrom\s*)?([\'"])([^\'"\n]+)\1')
CSS_URL = re.compile(r'url\(\s*([\'"]?)([^)\'"\s]+)\1\s*\)')
DECL = re.compile(r'\b(?:const|let)\s+(\w+)\s*=\s*([\'"])([^\'"\n]+)\2')
ACCESS = re.compile(r'\b([\w.]+?)(?:\?\.|\.)(getItem|setItem|removeItem)\s*\(\s*([^,)]+)')


def sha(blob):
    return hashlib.sha256(blob).hexdigest()


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args])


def location(text, start):
    return {'line': text.count('\n', 0, start) + 1,
            'column': start - text.rfind('\n', 0, start)}


def references(path, text):
    patterns = [ATTR, CSS_URL] if path.endswith(('.html', '.svg')) else ([IMPORT, ATTR] if path.endswith(('.js', '.mjs')) else [CSS_URL])
    for pattern in patterns:
        for match in pattern.finditer(text):
            yield match.group(2), match.start(2), match.end(2)


def resolve(path, ref):
    if ref.startswith(('#', 'data:')):
        return None
    parts = urlsplit(html.unescape(ref))
    assert not parts.scheme and not parts.netloc, f'External runtime URL: {path}: {ref}'
    target = posixpath.normpath(posixpath.join(posixpath.dirname(path), unquote(parts.path)))
    if ref.startswith('/'):
        target = unquote(parts.path).lstrip('/') or '.'
    if parts.path.endswith('/') or target == '.':
        target = posixpath.join(target, 'index.html')
    assert not target.startswith('../'), f'Escaping runtime URL: {path}: {ref}'
    return posixpath.normpath(target)


def allowed(path):
    parts = Path(path).parts
    if any(p.startswith('.') or re.search(r'(^|[._-])(test|spec|server|debug|log)([._-]|$)', p, re.I) for p in parts):
        return False
    if any(p.lower() in {'tests', 'scripts', 'logs', 'node_modules'} for p in parts):
        return False
    return (path == 'index.html' or Path(path).suffix in ASSETS or
            (Path(path).suffix in {'.js', '.mjs', '.css'} and (len(parts) == 1 or parts[0] == 'src')))


def safety(path, text):
    assert not PRIVATE.search(text), f'Private material in {path}'
    assert not re.search(r'\b(?:indexedDB|serviceWorker|sessionStorage|fetch|XMLHttpRequest|WebSocket|importScripts)\b|\bimport\s*\(|@import|(?:localStorage|sessionStorage|storage)\??\.clear\s*\(|(?:localStorage|storage)\s*\[|<iframe\b|<base\b', text), f'Unreviewed dynamic runtime/storage in {path}'


def audit_storage(path, text):
    declarations = {m.group(1): m for m in DECL.finditer(text)}
    keys, accesses = {}, []
    matches = list(ACCESS.finditer(text))
    # Count every operation, including secondary and optional-chain accesses.
    assert len(matches) == len(re.findall(r'\b(?:getItem|setItem|removeItem)\s*\(', text)), f'Unresolved storage operation in {path}'
    for match in matches:
        arg = match.group(3).strip()
        access = {'path': path, **location(text, match.start()), 'operation': match.group(2), 'argument': arg}
        literal = re.fullmatch(r'([\'"])([^\'"]+)\1', arg)
        if literal:
            key = literal.group(2)
            start = match.start(3) + match.group(3).index(arg) + 1
        elif arg in declarations:
            declaration = declarations[arg]
            key, start = declaration.group(3), declaration.start(3)
        else:
            # The single audited forwarding adapter in Astra APP1. Its caller's
            # concrete literals are independently resolved in workspace.js.
            assert path == 'src/app.js' and arg == 'key' and match.group(1) == 'localStorage', f'Dynamic storage key: {path}: {arg}'
            assert 'const storage = { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) };' in text
            access['forwarding'] = True
            accesses.append(access)
            continue
        access['original_key'] = key
        keys[start] = key
        accesses.append(access)
    return keys, accesses


def export_app(source_root, run, image):
    run_id = run['run_id']
    phase = 'baseline' if run_id == 'terra-APP4-r01' else 'feature'
    pin = run[phase]['final_commit']
    assert pin == image['source_commit'] and phase == image['phase']
    repo = source_root / 'apps' / run['model'] / run['arm'] / 'r01'
    assert git(repo, 'rev-parse', 'HEAD').decode().strip() == pin, f'HEAD mismatch: {run_id}'
    tracked = git(repo, 'ls-tree', '-r', '--name-only', pin).decode().splitlines()
    # Follow only the runtime dependency graph, never the ambient worktree.
    pending, blobs = ['index.html'], {}
    while pending:
        path = pending.pop()
        if path in blobs:
            continue
        assert path in tracked and allowed(path), f'Unapproved/missing runtime file: {run_id}/{path}'
        mode = git(repo, 'ls-tree', pin, '--', path).decode().split()[0]
        assert mode in {'100644', '100755'}, f'Non-regular runtime file: {path}'
        blob = git(repo, 'show', f'{pin}:{path}')
        blobs[path] = blob
        if Path(path).suffix in TEXT:
            text = blob.decode()
            safety(path, text)
            for ref, _, _ in references(path, text):
                target = resolve(path, ref)
                if target:
                    pending.append(target)
    files, output, key_locations, accesses, surfaces = [], {}, defaultdict(list), [], []
    for path, blob in sorted(blobs.items()):
        replacements = []
        if Path(path).suffix in TEXT:
            text = blob.decode()
            surfaces.extend({'path': path, 'line': number, 'source': line.strip()}
                            for number, line in enumerate(text.splitlines(), 1)
                            if re.search(r'localStorage|sessionStorage|indexedDB|serviceWorker|getItem|setItem|removeItem', line))
            if path.endswith(('.js', '.mjs')):
                keys, found = audit_storage(path, text)
                accesses.extend(found)
                for start, key in keys.items():
                    replacement = {'kind': 'storage-key', 'start': start, 'before': key,
                                   'after': f'instantcalc-demo:{run_id}:{key}', **location(text, start)}
                    replacements.append(replacement)
                    key_locations[key].append({'path': path, **location(text, start)})
            for ref, start, _ in references(path, text):
                if ref.startswith('/'):
                    assert path == 'index.html', f'Unreviewed root URL outside entry HTML: {path}'
                    replacements.append({'kind': 'relative-url', 'start': start, 'before': ref, 'after': '.' + ref, **location(text, start)})
            for change in sorted(replacements, key=lambda c: c['start'], reverse=True):
                start = change['start']
                assert text[start:start + len(change['before'])] == change['before']
                text = text[:start] + change['after'] + text[start + len(change['before']):]
            served = text.encode()
        else:
            served = blob
        output[f'{run_id}/{path}'] = served
        files.append({'path': path, 'source_sha256': sha(blob), 'served_sha256': sha(served),
                      'replacements': sorted(replacements, key=lambda c: c['start'])})
    assert key_locations, f'No storage keys resolved: {run_id}'
    return {'run_id': run_id, 'model': run['model'], 'arm': run['arm'], 'phase': phase,
            'classification': run['classification'], 'phase_classification': run[phase]['classification'],
            'source_commit': pin, 'storage_keys': [
                {'original': key, 'served': f'instantcalc-demo:{run_id}:{key}', 'locations': locs}
                for key, locs in sorted(key_locations.items())],
            'storage_accesses': accesses, 'storage_surfaces': surfaces, 'files': files}, output


def directory(apps):
    cards = []
    for app in apps:
        rid = app['run_id']
        phase = 'Final baseline only · feature unsent' if app['phase'] == 'baseline' else 'Final feature'
        cards.append(f'''<article data-run="{rid}"><h2>{app['model'].title()} {app['arm']}</h2>
<p><span class="badge">{phase}</span> <span class="badge {app['classification']}">{app['classification']}</span></p>
<p><a class="try" href="{rid}/" target="_blank" rel="noopener">Try the app ↗</a></p>
<p><a href="../mobile/{rid}.webp" target="_blank" rel="noopener">Full-size screenshot ↗</a></p></article>''')
    return ('''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Try all sixteen InstantCalc apps · From Opcode to Intent</title><link rel="stylesheet" href="styles.css"></head>
<body><main><nav aria-label="Return links"><a href="../../#/instantcalc-mobile">← Mobile gallery</a><a href="../">Detailed benchmark &amp; methods</a></nav>
<p class="eyebrow">FROM OPCODE TO INTENT / INSTANTCALC</p><h1>Try all sixteen apps</h1>
<p>These are demonstration copies of the frozen source versions shown in the gallery, not newly qualified runs. The apps retain their original interface and known failures. Start with your own inputs; screenshot sample states are not preloaded.</p>
<p>Badges show the original final run outcome: <strong>qualified</strong> met the recorded gates; <strong>app-failed</strong> had measured failures; <strong>blocked</strong> lacked required evidence and does not mean app failure. Terra APP4 serves its final baseline because its feature request was unsent. See the detailed benchmark for phase results and individual failures.</p>
<p>Each demo saves separately in this browser. Hosting copies adapt storage-key literals and local asset links only; these adaptations are not new benchmark measurements.</p>
<div class="apps">''' + '\n'.join(cards) + '''</div><footer><a href="manifest.json">Source commits, file hashes &amp; exact hosting adaptations</a></footer></main></body></html>
''').encode()


def validate_public(manifest, outputs):
    runs = json.loads((PUBLIC / 'data/benchmark.json').read_text())['runs']
    images = {r['run_id']: r for r in json.loads((PUBLIC / 'mobile/manifest.json').read_text())['rows']}
    assert len(manifest['apps']) == len(runs) == 16
    assert {a['run_id'] for a in manifest['apps']} == {r['run_id'] for r in runs}
    all_keys = []
    for app in manifest['apps']:
        rid = app['run_id']
        run = next(r for r in runs if r['run_id'] == rid)
        assert app['source_commit'] == run[app['phase']]['final_commit'] == images[rid]['source_commit']
        assert app['phase'] == images[rid]['phase']
        closure = {f['path'] for f in app['files']}
        reached, pending = set(), ['index.html']
        for key in app['storage_keys']:
            assert key['served'] == f'instantcalc-demo:{rid}:{key["original"]}'
            all_keys.append(key['served'])
        for file in app['files']:
            path = file['path']
            blob = outputs[f'{rid}/{path}']
            assert allowed(path) and sha(blob) == file['served_sha256']
            if Path(path).suffix in TEXT:
                text = blob.decode()
                safety(path, text)
                original = text
                for change in file['replacements']:
                    start = change['start']
                    assert original[start:start + len(change['after'])] == change['after']
                    original = original[:start] + change['before'] + original[start + len(change['after']):]
                assert sha(original.encode()) == file['source_sha256']
                if path.endswith(('.js', '.mjs')):
                    found, _ = audit_storage(path, text)
                    assert set(found.values()) <= {k['served'] for k in app['storage_keys']}
                for ref, _, _ in references(path, text):
                    assert not ref.startswith('/'), f'Root-dependent URL: {rid}/{path}'
                    target = resolve(path, ref)
                    if target:
                        assert target in closure, f'Missing dependency: {rid}/{path}: {ref}'
        while pending:
            path = pending.pop()
            if path in reached:
                continue
            reached.add(path)
            if Path(path).suffix in TEXT:
                for ref, _, _ in references(path, outputs[f'{rid}/{path}'].decode()):
                    target = resolve(path, ref)
                    if target:
                        pending.append(target)
        assert reached == closure, f'Extraneous runtime files: {rid}'
    assert len(all_keys) == len(set(all_keys)), 'Shared-origin storage collision'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    assert args.source_root or args.check, 'Export requires explicit --source-root'
    if args.source_root:
        runs = json.loads((PUBLIC / 'data/benchmark.json').read_text())['runs']
        images = {r['run_id']: r for r in json.loads((PUBLIC / 'mobile/manifest.json').read_text())['rows']}
        apps, outputs, original = [], {}, defaultdict(list)
        for run in runs:
            app, files = export_app(args.source_root, run, images[run['run_id']])
            apps.append(app)
            outputs.update(files)
            for key in app['storage_keys']:
                original[key['original']].append(app['run_id'])
        manifest = {'schema_version': 1, 'description': 'Frozen demonstration copies; hosting-only literal adaptations, no new measurement.',
                    'source_layout': 'apps/<model>/<arm>/r01',
                    'adaptations': ['Per-run storage-key namespace', 'Entry HTML root URLs made relative'],
                    'original_collisions': [{'key': key, 'run_ids': ids} for key, ids in sorted(original.items()) if len(ids) > 1], 'apps': apps}
        outputs['manifest.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
        outputs['index.html'] = directory(apps)
    else:
        manifest = json.loads((OUT / 'manifest.json').read_text())
        outputs = {str(p.relative_to(OUT)): p.read_bytes() for p in OUT.rglob('*') if p.is_file()}
    validate_public(manifest, outputs)
    expected = {'index.html', 'manifest.json', 'styles.css'} | {f'{a["run_id"]}/{f["path"]}' for a in manifest['apps'] for f in a['files']}
    if args.check:
        assert {str(p.relative_to(OUT)) for p in OUT.rglob('*') if p.is_file()} == expected, 'Unexpected public files'
        for path, blob in outputs.items():
            assert (OUT / path).read_bytes() == blob, f'Export differs: {path}'
    else:
        # Validate the entire cohort before writing any copy; never delete files.
        existing = {str(p.relative_to(OUT)) for p in OUT.rglob('*') if p.is_file()}
        assert existing <= expected, 'Unexpected files; refusing to overwrite an unknown export'
        for path, blob in outputs.items():
            dest = OUT / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(blob)
    print(f'Validated {len(manifest["apps"])} apps, {sum(len(a["files"]) for a in manifest["apps"])} runtime files, {sum(len(a["storage_keys"]) for a in manifest["apps"])} disjoint storage keys.')


if __name__ == '__main__':
    main()
