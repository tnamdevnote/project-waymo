# Cabin map: decided from /proto/map

Date: 2026-11-06. Built from the cabin-screen photo (the Figma node 217:371 no longer exists in the file).

## Picked: Chase

A hand-built 3D city (no real map data) seen from behind and above the car, in daytime colors. The route is a flat strip on the road: green ahead, blue behind, fading out at both ends.

- Camera: 13m behind the car, 26.5m up, aimed 14m ahead of it, 50° field of view
- Camera eases toward its target (rate 2.5/s) along a heading smoothed over ±6m of route; with reduced motion it snaps instead
- Route: 60m shown ahead, 25m behind; 2.4m wide; ahead `#00E89E` (Waymo green), behind `#0077FE` (Waymo blue)
- Cruise speed 9 m/s; slows to 4.5 m/s in turns; 2.5s stop at the stop line
- Other cars: pale blue `#9fcbef` boxes at 85% opacity, shown only within 60m of the car and fading into the background at the edge
- Palette: background and fog `#d4d4db` (fog 70–230m), road `#7a7884`, sidewalks `#ebeaee`, buildings `#dddce3`, markings `#f3f3f6`

## Rejected

- **Overview** (high, steep camera, most of the route plus a destination pin): good for "how far is left", but the car became a dot and it read as a map app, not a ride.
- **Perception** (dark scene, scan pulse, nearby cars and pedestrians lit up): strong trust story, but the busiest of the three and it broke from the light theme the rest of the screen uses.
- Chase's starting camera (6.5m up, 12m back) was raised to 26.5m up and 13m back, which looks down on the road ahead and the next turn instead of along it.
