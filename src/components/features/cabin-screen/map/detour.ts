// The way around the lane closure, once a remote agent has confirmed a safe path. The car eases
// one lane left past the cones, makes its usual right turn from that lane, then eases back into
// its own lane on the next street. Expressed as a sideways shift on top of the loop, so the sim,
// route and camera keep using one path.
import * as THREE from "three";
import { type Loop, loop, wrap } from "./world";

/** One lane to the left, meters. */
const SHIFT = 3.5;
/** Meters driven from the stop while moving over. Short: the cones are 4.2m ahead of the nose. */
const OUT = 6;
/** Held over until the turn begins, when the whole car is past the cones. On `rerouteLoop` the
 *  car goes straight on instead of turning there; same distance, since the first leg is shared. */
const HOLD = loop.corners[0][0] - loop.stopAt;
/** Meters to ease back into the car's own lane, through the turn and onto the next street. */
const BACK = 16;
/** How far past the stop the detour reaches. */
export const DETOUR_LENGTH = HOLD + BACK;

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Meters left of the route at `s` meters past the stop. */
function shiftAt(s: number) {
  if (s <= 0 || s >= DETOUR_LENGTH) return 0;
  if (s < OUT) return SHIFT * smooth(s / OUT);
  if (s < HOLD) return SHIFT;
  return SHIFT * (1 - smooth((s - HOLD) / BACK));
}

const ahead = new THREE.Vector3();
const behind = new THREE.Vector3();

/**
 * The car's path: the course (`loop`, or `rerouteLoop` after a reroute), shifted left while a detour starting at route distance `from` is in
 * effect. `wrapped` measures past the stop around the loop (for the route ribbon, which spans one
 * lap); otherwise `d` is the car's unwrapped distance and only that one pass is shifted.
 */
export function pathAt(
  course: Loop,
  d: number,
  from: number | null,
  out: THREE.Vector3,
  wrapped = false,
) {
  course.at(d, out);
  if (from === null) return out;
  const k = shiftAt(wrapped ? wrap(d - from, course.len) : d - from);
  if (k === 0) return out;
  course
    .at(d + 0.5, ahead)
    .sub(course.at(d - 0.5, behind))
    .normalize();
  // Left of the heading (x, z) is (z, -x).
  return out.set(out.x + ahead.z * k, 0, out.z - ahead.x * k);
}
