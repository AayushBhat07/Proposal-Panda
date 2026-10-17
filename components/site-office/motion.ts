import type { CrewId, CrewState, Point } from './crew';
import { CREW } from './crew';

/**
 * Where a character stands right now. Owned by the motion work (walking between waypoints).
 * Stub: everyone stays at their desk.
 */
export function useCrewPosition(id: CrewId, _state: CrewState): { position: Point; walking: boolean; facing: 'left' | 'right' } {
  return { position: CREW[id].desk, walking: false, facing: 'right' };
}
