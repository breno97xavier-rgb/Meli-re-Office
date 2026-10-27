import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { SourceTextModule, createContext } from 'node:vm';
const module = new SourceTextModule(stripTypeScriptTypes(readFileSync('src/services/calendarPeriod.ts','utf8'), {mode:'transform'}), {context:createContext({Intl})});
await module.link(()=>{throw Error('Unexpected import');});await module.evaluate();
const period=module.namespace;
test('week includes seven civil days across month/year without dropping Sunday',()=>{
  assert.deepEqual(Array.from(period.calendarWeek('2027-01-01')),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
  assert.equal(period.calendarWeek('2027-01-03')[0],'2026-12-28');
});
test('period navigation handles leap dates, month ends and civil days at DST transitions',()=>{
  assert.equal(period.shiftCalendarPeriod('2028-01-31','month',1),'2028-02-29');
  assert.equal(period.shiftCalendarPeriod('2027-01-31','month',1),'2027-02-28');
  assert.equal(period.shiftCalendarPeriod('2026-12-31','day',1),'2027-01-01');
  assert.equal(period.shiftCalendarPeriod('2026-10-27','week',-1),'2026-10-20');
  assert.equal(period.shiftCalendarDate('2026-11-01',1),'2026-11-02');
});
test('civil labels do not display preceding day in Brazilian time zones',()=>{
  assert.match(period.calendarDateLabel('2026-10-27',true),/27 de outubro de 2026/);
});
