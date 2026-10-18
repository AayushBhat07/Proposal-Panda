import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boqInsights, findBoq, rupees } from '../features/summarization/services/boq';

// Shaped like the CPWD schedules in real tender PDFs: wrapped descriptions, figures on the row's last line,
// page furniture between rows, rows split over short lines, and numbers inside descriptions.
const CIVIL = `Schedule of Quantity
for
Civil Work

Correction – Nil Insertion – Nil Deletion – Nil AE(P) EE (P) Page 104
SCHEDUE OF QUANTITY
Name of Work : Construction of Office building.
Item
No. Description of item Qty. Unit Rate
(in Rs.)
Amount
(in Rs.)
1 Earth Work
1.1
Earth work in excavation by
mechanical means.
1.1.1 All kinds of soil 4,190.00 Cum 219.34 9,19,035
1.2
Filling available excavated earth
in trenches.
4,190.00 Cum 242.2 10,14,818
3 R.C.C. Work
3.2
Add for using extra cement in the items
of design mix.
754
Quintal
906.39 6,83,418
Total 26,17,271

PART-C
SCHEDULE OF QUANTITY (E&M WORK)
Item
No. Description of Item Qty. Unit Rate Amount
SUB HEAD - I (Point Wiring)
1
Wiring for light point with 1.5 sq.mm
FRLSH copper conductor cable.
(a) Group C 226 Points 2590.53 585459.78
2
Wiring for group controlled point with
1.5 sq. mm FRLSH copper conductor cable.
(a) Group C 128 Points 1536.32 196648.96
3 PANEL 1 (GROUND FLOOR PANEL)
Design, manufacture and supply of a panel.
complete panel as above and complete 1.00 No. 158217.00 158217.00
Total 9,40,325.74`;

test('reads a CPWD schedule of quantities row by row', () => {
  const [civil, em] = findBoq(CIVIL);
  assert.equal(civil.title, 'Civil work');
  assert.deepEqual(civil.items.map(i => i.no), ['1.1.1', '1.2', '3.2']);
  assert.equal(civil.items[0].description, 'Earth work in excavation by mechanical means. — All kinds of soil');
  assert.equal(civil.items[0].section, 'Earth Work');
  assert.deepEqual([civil.items[2].quantity, civil.items[2].unit, civil.items[2].amount], [754, 'Quintal', 683418]);
  assert.equal(civil.statedTotal, 2617271);
  assert.equal(civil.items.reduce((s, i) => s + i.amount, 0), civil.statedTotal);

  assert.equal(em.title, 'Electrical and mechanical work');
  // "1.5 sq. mm" inside item 2 is text, not item 1.5; "3 PANEL 1" is an item, not a heading.
  assert.deepEqual(em.items.map(i => i.no), ['1 (a)', '2 (a)', '3']);
  assert.match(em.items[2].description, /^PANEL 1 \(GROUND FLOOR PANEL\) Design/);
  assert.equal(em.items[0].section, 'I (Point Wiring)');
  assert.equal(Math.round(em.items.reduce((s, i) => s + i.amount, 0) * 100) / 100, em.statedTotal);
});

test('no schedule, no parts', () => {
  assert.deepEqual(findBoq('Notice inviting tender. Estimated cost Rs. 10,00,000. Time allowed 6 months.'), []);
});

test('insights find the few items carrying most of the value, and arithmetic slips', () => {
  const insights = boqInsights([
    {
      title: 'Civil work',
      statedTotal: 1000,
      items: [
        { no: '1', description: 'Concrete', quantity: 10, unit: 'Cum', rate: 70, amount: 700, section: 'RCC' },
        { no: '2', description: 'Steel', quantity: 2, unit: 'Kg', rate: 100, amount: 250, section: 'RCC' },
        { no: '3', description: 'Paint', quantity: 1, unit: 'LS', rate: 50, amount: 50, section: 'Finishing' },
      ],
    },
  ]);
  assert.deepEqual(insights.majorItems.map(i => i.no), ['1', '2']);
  assert.deepEqual(insights.arithmetic.map(i => i.no), ['2']);
  assert.deepEqual(insights.lumpSum.map(i => i.no), ['3']);
  assert.deepEqual(insights.bySection[0], { section: 'RCC', amount: 950, items: 2 });
  assert.equal(rupees('Rs. 15,64,86,955/-'), 156486955);
});

test('reads "per letter" units, rows whose unit wraps, and the Grand Total over sub-head totals', () => {
  const text = `SCHEDULE OF QUANTITIES
2.5 Lettering with black Japan paint of approved brand
20760 per
letter
per cm
height
6.15 127674.00
2.6 Providing and applying white cement based putty 665 sqm 156.05 103773.00
3 Providing services of manpower
3.1 IP-PBX system complete as required.
1 Each 1537488.1
2 1537488.12
a) Khallasi 24
Per
Person
Per
Month
29607.00 7,10,568.00
Total of Sub Head I 7,10,568.00
Grand Total
(I+II)
2479503.12`;
  const [part] = findBoq(text);
  assert.deepEqual(part.items.map(i => [i.quantity, i.unit, i.amount]), [
    [20760, 'per letter per cm height', 127674],
    [665, 'sqm', 103773],
    [1, 'Each', 1537488.12],
    [24, 'Per Person Per Month', 710568],
  ]);
  assert.equal(part.statedTotal, 2479503.12);
});
