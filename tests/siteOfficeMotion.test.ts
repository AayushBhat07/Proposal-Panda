import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CREW, WAYPOINTS, type CrewId } from '../components/site-office/crew';
import {
  AISLES,
  CORRIDORS,
  FOREMAN_DROP,
  chaiSpot,
  destinationFor,
  pathLength,
  planWalk,
  pointAlong,
  route,
} from '../components/site-office/motion';

const ids = Object.keys(CREW) as CrewId[];
const rows: number[] = Object.values(CORRIDORS);
const aisles: number[] = [...AISLES];

/** Every segment is axis-aligned and horizontal moves happen only on a corridor row. */
function assertCorridorRoute(path: { x: number; y: number }[]) {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    assert.ok(a.x === b.x || a.y === b.y, `diagonal segment ${JSON.stringify([a, b])}`);
    if (a.y === b.y && a.x !== b.x) assert.ok(rows.includes(a.y), `horizontal off-corridor at y=${a.y}`);
    if (a.x === b.x && i > 1 && i < path.length - 1) {
      // vertical moves between corridors happen in an aisle
      if (rows.includes(a.y) && rows.includes(b.y)) {
        assert.ok(aisles.includes(a.x), `corridor change outside an aisle at x=${a.x}`);
      }
    }
  }
}

test('idle crew wait near the chai counter, each on its own spot', () => {
  const spots = ids.map(chaiSpot);
  assert.equal(new Set(spots.map(p => `${p.x},${p.y}`)).size, ids.length);
  for (const p of spots) {
    assert.ok(Math.abs(p.x - WAYPOINTS.chai.x) <= 20 && p.y >= WAYPOINTS.chai.y && p.y - WAYPOINTS.chai.y <= 24);
  }
});

test('working states end at the desk, failed near the window', () => {
  for (const state of ['starting', 'working', 'redoing', 'needs-you', 'done'] as const) {
    assert.deepEqual(destinationFor('planner', state), CREW.planner.desk);
  }
  const w = destinationFor('planner', 'failed');
  assert.ok(Math.abs(w.x - WAYPOINTS.window.x) <= 20 && w.y > WAYPOINTS.window.y && w.y < 40);
});

test('routes within one corridor are L-shaped', () => {
  const path = route(chaiSpot('planner'), CREW.planner.desk);
  assert.deepEqual(path[0], chaiSpot('planner'));
  assert.deepEqual(path.at(-1), CREW.planner.desk);
  assertCorridorRoute(path);
  assert.equal(path.length, 4);
});

test('routes between corridors change rows in an aisle', () => {
  for (const id of ids) {
    for (const from of [chaiSpot(id), WAYPOINTS.door, CREW.correspondence.desk, CREW.engineer.desk]) {
      const path = route(from, CREW[id].desk);
      assert.deepEqual(path.at(-1), CREW[id].desk);
      assertCorridorRoute(path);
    }
  }
  assert.equal(route(CREW.engineer.desk, CREW.correspondence.desk).length, 6);
});

test('route to the same point is a single point', () => {
  assert.deepEqual(route(CREW.clerk.desk, CREW.clerk.desk), [CREW.clerk.desk]);
  assert.equal(pathLength(route(CREW.clerk.desk, CREW.clerk.desk)), 0);
});

test('done walks to the Foreman and back; the Foreman stays put', () => {
  const path = planWalk('safety', 'done', CREW.safety.desk);
  assert.ok(path.some(p => p.x === FOREMAN_DROP.x && p.y === FOREMAN_DROP.y));
  assert.deepEqual(path.at(-1), CREW.safety.desk);
  assertCorridorRoute(path);
  assert.deepEqual(planWalk('foreman', 'done', CREW.foreman.desk), [CREW.foreman.desk]);
});

test('pointAlong interpolates to integers and reports direction', () => {
  const path = [{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: -20, y: 10 }];
  assert.equal(pathLength(path), 30);
  assert.deepEqual(pointAlong(path, 0), { position: { x: 0, y: 0 }, dx: 0, arrived: false });
  assert.deepEqual(pointAlong(path, 4.6), { position: { x: 0, y: 5 }, dx: 0, arrived: false });
  assert.deepEqual(pointAlong(path, 15.3), { position: { x: -5, y: 10 }, dx: -1, arrived: false });
  assert.deepEqual(pointAlong(path, 30), { position: { x: -20, y: 10 }, dx: 0, arrived: true });
  assert.deepEqual(pointAlong(path, Infinity).position, { x: -20, y: 10 });
});
