import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countdown, datesOnPortal, daysUntil, findKeyDates, formatKeyDate } from '../features/summarization/services/dates';

const pick = (text: string) => Object.fromEntries(findKeyDates(text).map(d => [d.kind, d.time ? `${d.date} ${d.time}` : d.date]));

test('CPWD NIT table: label wrapped over lines, time before the date', () => {
  const text = [
    'Stipulated Period of Completion',
    'of work (in months)',
    '15 Months',
    'Last time & date of submission',
    'of online bid, copy of receipt of',
    'deposition of original EMD and',
    'other documents as specified in',
    'Notice Inviting e-Tender.',
    '03:00 PM on 01.09.2026',
    'Time date of opening of bid 03:30 PM on 01.09.2026',
  ].join('\n');
  assert.deepEqual(pick(text), { submission: '2026-09-01 15:00', opening: '2026-09-01 15:30' });
});

test('portal-style rows, 24-hour times, pre-bid and noon', () => {
  assert.deepEqual(
    pick(
      'Bid Submission Last Date 01-12-2018 till 03:00 PM\nBid Opening Date 01-12-2018 at 03:30 PM\n' +
        'Pre-Bid meeting Date & Time Dt. 20.03.2026 at 12.00 noon'
    ),
    { submission: '2018-12-01 15:00', opening: '2018-12-01 15:30', preBid: '2026-03-20 12:00' }
  );
  assert.deepEqual(pick('Last date of online submission\nof e-Tender 08/01/2024 up to\n15.00 hours\nOpening of online technical Bid\n09/01/2024 at 16.00 hours'), {
    submission: '2024-01-08 15:00',
    opening: '2024-01-09 16:00',
  });
});

test('a range gives its end as the deadline', () => {
  assert.deepEqual(pick('5 Bid clarification From 20-12-2024 at 11:00 hrs to 06-01-2025 at 14:30 hrs'), { queries: '2025-01-06 14:30' });
});

test('dates from other columns and unlabelled dates are ignored', () => {
  assert.deepEqual(pick('Time and date of opening of tenders 1. Renovation of toilets 7,04,913/- 2months 14,100/- 30.6.16 up to 4.00 PM'), {});
  assert.deepEqual(pick('Turnover in the last five financial years ending 31.03.2026 shall be at least Rs. 5 crore.'), {});
});

test('countdowns', () => {
  const today = new Date(2026, 9, 16);
  assert.equal(daysUntil('2026-10-20', today), 4);
  assert.equal(countdown('2026-10-20', today), 'in 4 days');
  assert.equal(countdown('2026-10-17', today), 'tomorrow');
  assert.equal(countdown('2026-09-01', today), '45 days ago');
  assert.match(formatKeyDate({ date: '2026-09-01', time: '15:00' }), /^01 Sep\w* 2026, 15:00$/);
});

test('skips "As per CPP portal" rows, reads "Tender Opening" and OCR-split times', () => {
  const portal = '13 Date & time of pre-bid meeting : As per CPP portal\n14 Venue of pre-bid meeting : As per CPP portal\n16 Tentative date of technical presentation : 3rd June 2026';
  assert.deepEqual(findKeyDates(portal), []);
  assert.equal(datesOnPortal(portal), true);
  const spa = '• Date and Place of Tender Opening: 14:00 Hours on 11th May 2026 at Conference Room';
  assert.deepEqual(findKeyDates(spa).map(d => [d.kind, d.date, d.time]), [['opening', '2026-05-11', '14:00']]);
  const scan = 'Pre- bi d Mee ting Date, Time & Pl ace At. 11.00. A.M on 19.02.2026\nDate and time of opening of bid on 11 .00 A.M at 25.02.2026';
  assert.deepEqual(findKeyDates(scan).map(d => [d.kind, d.time]), [['opening', '11:00'], ['preBid', '11:00']]);
});
