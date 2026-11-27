# The Space Between

A 3D sanctuary for slow moments. Wander a floating garden **6 km across** — hills, groves and a rim of high ground you can see from the middle — gather its drifting lights, and plant them as flowers.

## Run locally

```sh
npm install
npm run dev
```

Use WASD or the arrow keys to move, hold **Shift** to run, drag to look around, and press Space to plant a collected light. Touch controls are available on smaller screens.

Tuning lives at the top of `src/main.js`: `ARENA_RADIUS` (3000 m → a 6 km arena), `WALK_SPEED`, `SPRINT_SPEED` and `EDGE_LIMIT`.

## GitHub Pages

After merging into `main`, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The deploy workflow builds the Vite app and publishes it to Pages on every push to `main`. You can also run it manually from the Actions tab.
