import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(process.cwd(), 'src');
const TEST_FILE = /\.test\.(js|jsx)$/;

function listSourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return TEST_FILE.test(entry.name) ? [] : [path];
  });
}

describe('abandoned Render backend', () => {
  it('is not referenced by any non-test source file', () => {
    const files = listSourceFiles(SRC_ROOT);
    expect(files.length).toBeGreaterThan(10);
    const offenders = files.filter((file) => /onrender/i.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
