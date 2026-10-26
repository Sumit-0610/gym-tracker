const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EXERCISES } = require('../../src/seed');

const IMAGE_DIR = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'client',
  'public',
  'exercise-images',
);

test('exercise names are unique', () => {
  const names = EXERCISES.map(([name]) => name);
  assert.equal(new Set(names).size, names.length);
});

test('every exercise has a muscle group and a YouTube video id', () => {
  for (const [name, muscle, , video] of EXERCISES) {
    assert.ok(muscle, `${name} has no muscle group`);
    assert.match(video, /^[A-Za-z0-9_-]{11}$/, `${name} video id`);
  }
});

test('every image named in the list exists', () => {
  for (const [name, , image] of EXERCISES) {
    if (image === null) continue;
    const file = path.join(IMAGE_DIR, `${image}.webp`);
    assert.ok(fs.existsSync(file), `${name}: missing ${file}`);
  }
});

test('no image file is left unused', () => {
  const used = new Set(EXERCISES.map(([, , image]) => `${image}.webp`));
  const files = fs.readdirSync(IMAGE_DIR).filter((f) => f.endsWith('.webp'));
  assert.deepEqual(
    files.filter((f) => !used.has(f)),
    [],
  );
});
