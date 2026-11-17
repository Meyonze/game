# NEON RIFT: DUEL

Japanese third-person 1v1 mech combat. Choose crimson AKATSUKI (RONIN / 04, melee assault) or white BYAKUYA (AETHER / 02, mobile ranged), then fight the other frame's AI in a 120-second arena duel. Published as part of Meyonze Games at https://meyonze.github.io/game/neon-rift-duel/.

## Play

- WASD / arrow keys: move relative to the locked opponent
- Left click / J: fire; right click / C: guard
- F: melee; Q: plasma; E: overdrive when charged
- Shift: evasive boost; Space: jump; Escape: pause
- Touch: left stick plus labeled action buttons
- FX: change rendering quality; SOUND: toggle synthesized audio

The hangar previews both animated models. Combat includes attack anticipation, perfect guards, invulnerability during boosts, energy and weapon heat, cover collision, swept projectile collision, AI movement and attacks, a timed result, rematches, and browser-local victory counts.

## Implementation and assets

Static, buildless HTML/JS in this directory. No gameplay backend or install is required. `combat.mjs` owns the simulation, `visuals.js` owns the arena and animated actors, `post.js` implements bloom, and `duel.js` handles input, camera, UI and feedback. Vendored Three.js 0.170.0, GLTFLoader, BufferGeometryUtils and Reflector use the MIT license.

The real skinned mech models and thumbnails are FORGE assets by Ramon Linares, downloaded from https://github.com/RamonLinares/atlas-09 (RONIN / 04 and AETHER / 02). They include textures, rigs and baked animations, released under CC0. See `licenses/FORGE-ASSETS.md` and `FORGE-CC0.txt`; motion credits include Quaternius / Gonzalo Furnier. These assets were not authored by this project. The title key art was generated using the licensed RONIN concept reference. No models or source code were copied from the user's reference game, Universe Duel.

Lighting includes an HDR environment, shadows, an eclipse skyline, and optional planar floor reflection. Combat feedback includes a blade ribbon driven by the actual sword bone, sparks, muzzle flashes, impact slowdown, camera shake, damage text and synthesized sound. Mobile starts with reduced rendering cost. Google Fonts have system fallbacks.

## Validation

Run `node tests/combat.mjs`, `node tests/models.mjs`, and `node tests/controller.mjs`.

Combat checks cover damage, guard/parry timing, melee anticipation, boost cost and invulnerability, projectiles and cover, jump landing, arena collisions, pause, restart, defeat and time-limit draws. Both frames' win tests use a stationary opponent to verify damage and progression; they do not establish difficulty or balance.

Model checks parse both real GLBs, verify skeleton references, exercise seven motion states, and check finite transforms and bounds. Controller checks cover loading, selection, deployment, countdown, desktop/portrait camera projection, pause, guide, result, rematch and navigation.

These are Node tests with image textures and browser/renderer stubs. They do not verify image decoding, WebGL/GLSL compilation, actual screen composition, browser input or mobile performance. Browser QA was unavailable in the managed environment and remains unverified.
