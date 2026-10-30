"""Content-addressed, byte-exact QA bundles. Original test outputs stay untouched."""
import argparse
import glob
import hashlib
import json
import os
from pathlib import Path
import shutil


def digest(data):
    return hashlib.sha256(data).hexdigest()


def contained(base, name):
    result = (base / name).resolve()
    if not result.is_relative_to(base.resolve()):
        raise ValueError('Path escapes bundle root')
    return result


def package(root, output, patterns):
    root, output = root.resolve(), output.resolve()
    safe = root / 'arcade/qa/artifact-v16'
    if not output.is_relative_to(safe) or output == safe:
        raise ValueError('Output must be a dedicated QA bundle directory')
    files = set()
    missing = []
    for pattern in patterns:
        matches = glob.glob(str(contained(root, pattern)), recursive=True)
        if not matches:
            missing.append(pattern)
        for match in matches:
            p = Path(match)
            candidates = p.rglob('*') if p.is_dir() else [p]
            for file in candidates:
                if file.is_file() and not file.is_symlink() and not file.resolve().is_relative_to(safe):
                    if not file.resolve().is_relative_to(root):
                        raise ValueError('Source escapes repository')
                    files.add(file.resolve())
    if output.exists():
        shutil.rmtree(output)
    (output / 'objects').mkdir(parents=True)
    entries, unique = [], {}
    for file in sorted(files):
        data = file.read_bytes()
        sha = digest(data)
        if sha not in unique:
            object_name = 'objects/' + sha + file.suffix
            (output / object_name).write_bytes(data)
            unique[sha] = {'path': object_name, 'bytes': len(data)}
        entries.append({'path': file.relative_to(root).as_posix(), 'object': unique[sha]['path'], 'sha256': sha, 'bytes': len(data)})
    source_bytes = sum(e['bytes'] for e in entries)
    stored_bytes = sum(e['bytes'] for e in unique.values())
    report = {'schema': 1, 'method': 'byte-exact SHA256 deduplication; no rescale, re-encoding or test deletion',
              'commit': os.environ.get('GITHUB_SHA'), 'run': os.environ.get('GITHUB_RUN_ID'),
              'job': os.environ.get('GITHUB_JOB'), 'sourceFiles': len(entries), 'uniqueFiles': len(unique),
              'sourceBytes': source_bytes, 'storedBytes': stored_bytes, 'savedBytes': source_bytes - stored_bytes,
              'missingPatterns': missing, 'entries': entries}
    (output / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    (output / 'README.txt').write_text('All original paths and SHA256 hashes are in manifest.json.\n'
                                     'Restore from a repository checkout:\n'
                                     'python3 scripts/package-qa.py --restore /path/to/downloaded/bundle --destination /new/directory\n'
                                     'No original test output or historical artifact was deleted.\n')
    return report


def restore(bundle, destination):
    bundle, destination = bundle.resolve(), destination.resolve()
    manifest = json.loads((bundle / 'manifest.json').read_text())
    if manifest.get('schema') != 1 or not isinstance(manifest.get('entries'), list):
        raise ValueError('Unsupported manifest')
    # Validate all paths and objects before creating any recovered files.
    for entry in manifest['entries']:
        source = contained(bundle, entry['object'])
        target = contained(destination, entry['path'])
        data = source.read_bytes()
        if digest(data) != entry['sha256'] or len(data) != entry['bytes'] or target.exists():
            raise ValueError('Hash/size mismatch or destination already exists')
    for entry in manifest['entries']:
        target = contained(destination, entry['path'])
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(contained(bundle, entry['object']), target)
    return len(manifest['entries'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--restore', type=Path)
    parser.add_argument('--destination', type=Path)
    parser.add_argument('patterns', nargs='*')
    args = parser.parse_args()
    if args.restore:
        if not args.destination:
            parser.error('--destination is required')
        print('QA RESTORED', restore(args.restore, args.destination), 'byte-exact files')
    else:
        if not args.output or not args.patterns:
            parser.error('--output and source patterns are required')
        report = package(Path(__file__).resolve().parents[1], args.output, args.patterns)
        print('QA PACKAGE', json.dumps({k: report[k] for k in ['sourceFiles', 'uniqueFiles', 'sourceBytes', 'storedBytes', 'savedBytes']}))


if __name__ == '__main__':
    main()
