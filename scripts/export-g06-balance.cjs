// Curate the actual seeded runs; never synthesize or replace race outcomes.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'arcade/docs/v1.5');
const matrix = path.join(root, 'arcade/qa/racing-v15/balance');
const strategies = ['idle', 'basic', 'held', 'safe', 'skilled'];
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file));
const rows = file => JSON.parse(zlib.gunzipSync(fs.readFileSync(file + '.samples.json.gz')));
const write = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const beforeFile = process.env.RACE_BEFORE_REPORT || path.join(docs, 'batch5c-balance-before-20261028.json');
const before = read(beforeFile), beforeRows = rows(beforeFile), after = read(path.join(matrix, 'summary.json'));
const afterRows = strategies.flatMap(strategy => rows(path.join(matrix, strategy + '.json')));
assert(before.sourceHash === hash(execFileSync('git', ['show', '8314ab5:arcade/assets/games-core.js'], {cwd:root})));
assert(after.sourceHash === hash(fs.readFileSync(path.join(root, 'arcade/assets/games-core.js'))));
assert(before.strategyHash === after.strategyHash);
assert(before.seedCount === 50 && after.seedCount === 50);
assert(beforeRows.length === 3750 && afterRows.length === 3750);
// Older baseline runs have the identical outcomes but a separate detailed AI
// telemetry run. Attach it only after comparing every recorded race outcome.
const detailsFile = path.join(docs, 'batch5c-balance-before-details-20261028.json');
if (fs.existsSync(detailsFile)) {
  const details = read(detailsFile);
  assert(details.sourceHash === before.sourceHash && details.strategyHash === before.strategyHash);
  const key = r => [r.strategy, r.chapter, r.difficulty, r.seed].join('/');
  const detailed = new Map(rows(detailsFile).map(r => [key(r), r]));
  const fields = ['win', 'rank', 'status', 'time', 'bestLap', 'lapTimes', 'collisions', 'passes',
    'firstLead', 'caughtAfterLead', 'recaptures', 'aiPasses', 'boostSeconds', 'standings'];
  for (const row of beforeRows.filter(r => r.strategy === 'skilled')) {
    const detail = detailed.get(key(row));
    assert(detail, 'all 750 baseline skilled races have real detailed samples');
    for (const field of fields) assert.deepEqual(row[field], detail[field], key(row) + ' ' + field);
    Object.assign(row, {speeds:detail.speeds, rivals:detail.rivals, telemetry:detail.telemetry});
  }
}
for (const [label, report, samples] of [['before', before, beforeRows], ['after', after, afterRows]]) {
  const filename = 'batch5c-balance-' + label + '-20261028.json';
  write(path.join(docs, filename), {...report, label, baselineRef:label === 'before' ? '8314ab5' : null,
    completionPaths:samples.length, rawSamples:filename + '.samples.json.gz'});
  fs.writeFileSync(path.join(docs, filename + '.samples.json.gz'), zlib.gzipSync(JSON.stringify(samples)));
}
const profiles = [];
for (const [version, samples] of [['before', beforeRows], ['after', afterRows]]) {
  for (let chapter = 1; chapter <= 5; chapter++) for (const difficulty of ['normal', 'hard', 'expert']) {
    const group = samples.filter(r => r.strategy === 'skilled' && r.chapter === chapter && r.difficulty === difficulty);
    assert(group.length === 50);
    for (let driver = 0; driver < 5; driver++) {
      const id = 'ai-' + driver, rivals = group.map(r => r.rivals?.find(c => c.id === id));
      assert(rivals.every(r => r && r.lapTimes.length === (chapter === 1 ? 3 : 2)), 'complete actual AI laps');
      const speed = group.map(r => r.speeds[id]);
      const sampled = (sum, count) => {
        const n = speed.reduce((a, s) => a + (s[count] || 0), 0);
        return n ? speed.reduce((a, s) => a + (s[sum] || 0), 0) / n : null;
      };
      profiles.push({version, chapter, difficulty, id, races:50,
        meanLaps:rivals[0].lapTimes.map((_, i) => rivals.reduce((n, r) => n + r.lapTimes[i], 0) / 50),
        meanRemainingNitro:rivals.reduce((n, r) => n + r.nitro, 0) / 50,
        sampledSpeed:sampled('sum', 'count'), sampledCornerSpeed:sampled('cornerSum', 'cornerCount'),
        sampledStraightSpeed:sampled('straightSum', 'straightCount'),
        sampledEntrySpeed:sampled('entrySum', 'entryCount'), sampledExitSpeed:sampled('exitSum', 'exitCount')});
    }
  }
}
write(path.join(docs, 'batch5c-ai-profiles-20261028.json'), {
  method:'Actual lap crossing times; speeds sampled at 1Hz, including finish coast-down while other cars finish. Entry/exit are sampled curve-threshold transitions, not exact apex events.',
  sourceHashes:{before:before.sourceHash, after:after.sourceHash}, profiles
});
for (const strategy of strategies) {
  const means = report => Object.fromEntries(['podiumRate', 'firstPlaceRate', 'meanRank', 'meanPasses',
    'meanCollisions', 'meanCaught', 'meanRecaptures', 'meanAiPasses', 'meanBoostSeconds'].map(key => {
    const group = report.groups.filter(g => g.strategy === strategy);
    return [key, group.reduce((n, g) => n + g[key], 0) / group.length];
  }));
  console.log(JSON.stringify({strategy, before:means(before), after:means(after)}));
}
console.log('EXPORTED 7500 actual race outcomes / 150 AI profiles');
