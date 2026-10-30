"""Exercise byte-exact aliases, corruption, traversal and historical-output retention."""
from pathlib import Path
import importlib.util
import json
import tempfile

spec = importlib.util.spec_from_file_location('qa', Path(__file__).with_name('package-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    (root / 'original').mkdir()
    for name, content in [('a.png', b'original PNG bytes'), ('b.png', b'original PNG bytes'), ('failure.json', b'{"failed":true}')]:
        (root / 'original' / name).write_bytes(content)
    bundle = root / 'arcade/qa/artifact-v16/test'
    result = qa.package(root, bundle, ['original'])
    assert result['sourceFiles'] == 3 and result['uniqueFiles'] == 2
    assert result['savedBytes'] == len(b'original PNG bytes')
    target = root / 'restored'
    assert qa.restore(bundle, target) == 3
    for file in (root / 'original').iterdir():
        assert file.read_bytes() == (target / 'original' / file.name).read_bytes()
    manifest = json.loads((bundle / 'manifest.json').read_text())
    manifest['entries'][0]['path'] = '../escape'
    (bundle / 'manifest.json').write_text(json.dumps(manifest))
    try:
        qa.restore(bundle, root / 'unsafe')
        raise AssertionError('traversal accepted')
    except ValueError:
        pass
    qa.package(root, bundle, ['original'])
    source = next((bundle / 'objects').iterdir())
    source.write_bytes(b'damaged')
    try:
        qa.restore(bundle, root / 'corrupt')
        raise AssertionError('corrupt data accepted')
    except ValueError:
        pass
    assert len(list((root / 'original').iterdir())) == 3
print('QA PACKAGE PASS: deduplication, exact recovery, failure evidence, original files, corruption and traversal')
