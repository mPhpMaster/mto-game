/**
 * يرفع رقم الإصدار في package.json (patch: 0.1.0 → 0.1.1).
 *   npm run version:bump
 *   npm run version:bump -- minor
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const part = process.argv[2] === 'minor' ? 'minor' : 'patch';
const pkgPath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map((n) => parseInt(n, 10) || 0);

let next;
if (part === 'minor') {
  next = `${major}.${minor + 1}.0`;
} else {
  next = `${major}.${minor}.${patch + 1}`;
}

pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
console.log(`✓ الإصدار: ${next}`);
