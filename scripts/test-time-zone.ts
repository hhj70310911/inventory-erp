import assert from 'node:assert/strict';
import {formatInstant,dateInZone,validTimeZone} from '../src/lib/erp/time-zone';
assert.equal(validTimeZone('not/a-zone'),false);
assert.match(formatInstant('2026-01-15T00:00:00Z','Australia/Melbourne'),/11:00:00.*GMT\+11/);
assert.match(formatInstant('2026-07-15T00:00:00Z','Australia/Melbourne'),/10:00:00.*GMT\+10/);
assert.match(formatInstant('2026-01-15T00:00:00Z','Australia/Perth'),/08:00:00.*GMT\+8/);
assert.match(formatInstant('2026-01-15T00:00:00Z','Australia/Adelaide'),/10:30:00.*GMT\+10:30/);
assert.equal(dateInZone(new Date('2026-01-15T14:00:00Z'),'Australia/Melbourne'),'2026-01-16');
assert.equal(dateInZone(new Date('2026-01-15T14:00:00Z'),'Australia/Perth'),'2026-01-15');
console.log('PASS: Melbourne summer/winter, Perth, Adelaide half-hour offset and cross-day defaults.');

