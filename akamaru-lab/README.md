# AKAMARU — real-time character study

An independent, interactive 3D prototype for Meyonze Games. Open `index.html` over HTTP. It reuses the repository's vendored Three.js 0.170.0 (MIT, license in `../neon-rift-duel/vendor/THREE-LICENSE.txt`). No build, network model downloads or gameplay backend required. Google Fonts have system fallbacks.

The character is newly modeled in code with ellipsoids, beveled shaped armor, a continuous striped tail surface, face details, a scarf and a curved sword. It uses MeshToonMaterial with a three-step gradient and inverted-hull screen-space outlines. It is a simplified interpretation of the generated concept, not a claim to reproduce that image's fidelity. The procedural hierarchy animates breathing, running, scarf/tail movement and a complete anticipation/strike/recovery sequence. This is a separate character prototype; DUEL has not been replaced.

Controls: drag to orbit, wheel/pinch to zoom, front/back/follow views, idle/run-in-place preview, F or Space or the strike button to slash, WASD/arrows to move. Follow view exposes touch direction buttons. Outline width and toon/smooth shading can be compared live. Hidden tabs pause updates; WebGL initialization and context-loss errors appear onscreen.

Validation: `node akamaru-lab/test.mjs` checks actual geometry, animation transforms, ground contact, outline controls and asset references. `node akamaru-lab/controller-test.mjs` exercises the controller with a mock renderer/DOM. Geometry was also inspected using an offline Blender render of the same meshes. That render is not the browser's shader output. Real browser/WebGL interaction and performance remain unverified because browser QA was unavailable in the managed environment.
