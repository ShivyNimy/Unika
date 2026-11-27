# The Space Between

A 3D sanctuary for slow moments. Wander a floating garden **6 km across** — hills, groves and a rim of high ground you can see from the middle — gather its drifting lights, and plant them as flowers.

## Run locally

```sh
npm install
npm run dev
```

Use WASD or the arrow keys to move, hold **Shift** to run, drag to look around, and press Space to plant a collected light.

### On phones and tablets
- **Virtual joystick** (bottom left) to wander, **RUN** to sprint, **✦ PLANT** to leave a light.
- **Drag anywhere** on the world to look around; dragging up/down tilts the view.
- Double-tap the joystick to toggle run. Light pickups give a small haptic buzz.
- **←** in the header returns to the landing screen; **⛶** toggles fullscreen (entering the garden asks for it automatically on touch devices).

### Compact mode
The layout squeezes itself down automatically on small screens, short/landscape windows and any OS-level "reduced/compact" preference. Toggle it by hand with the **◱** header button or the **C** key — your choice is remembered in `localStorage`, and it also tightens the HUD/copy so the 3D view stays the star of the show.

Touch devices also get a lighter render profile (fewer trees/rocks/flowers, smaller shadow map, capped pixel ratio) so 6 km of forest stays smooth on a phone.

Tuning lives at the top of `src/main.js`: `ARENA_RADIUS` (3000 m → a 6 km arena), `WALK_SPEED`, `SPRINT_SPEED` and `EDGE_LIMIT`.

## GitHub Pages

After merging into `main`, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The deploy workflow builds the Vite app and publishes it to Pages on every push to `main`. You can also run it manually from the Actions tab.
