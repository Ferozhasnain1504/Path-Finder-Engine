# Pathfinder Console

A visual, interactive playground for classic shortest-path algorithms — draw your own network, drop a start and destination, and watch Dijkstra, A*, Bellman-Ford, and BFS race to find a route.

**[Live Demo](https://ferozhasnain1504.github.io/Path-Finder-Engine/)**

![Pathfinder Console preview](/preview.png)

## Overview

Pathfinder Console renders four pathfinding algorithms as four "metro lines" on a grid-based transit network. Each algorithm is animated step-by-step so you can *see* the difference between them, not just read about it — why A* scans fewer nodes than Dijkstra, why BFS can find a technically valid but more expensive route through congested cells, and why Bellman-Ford sweeps the whole grid in rounds instead of expanding outward from a priority queue.

Built as a single dependency-free HTML file — no framework, no build step, no backend.

## Features

- **Four algorithms**: Dijkstra's Algorithm, A* Search, Bellman-Ford, and Breadth-First Search, each color-coded and paired with a short explanation of how it works
- **Editable network**: click and drag to place walls (blocked cells) and traffic zones (weighted cells, cost = 5), and reposition the start/end points freely
- **Live simulation**: real-time animation of nodes being scanned, followed by a progressively drawn final route
- **Departure-board stats**: elapsed time, nodes scanned, route length (hops), and route cost, updated live during the run
- **Compare All Lines**: runs all four algorithms on the current map at once and displays a side-by-side table of nodes scanned, route cost, and compute time — makes the algorithmic trade-offs immediately visible
- **Random network generator**: instantly generates a solvable maze with walls and traffic zones
- Fully responsive, works on desktop and touch devices

## Algorithms implemented

| Algorithm | Weighted | Optimal | Notes |
|---|---|---|---|
| Dijkstra's Algorithm | Yes | Yes | Priority-queue based, expands the cheapest known node first |
| A* Search | Yes | Yes | Dijkstra + Manhattan-distance heuristic, explores fewer nodes |
| Bellman-Ford | Yes | Yes | Relaxes all edges per round; slower but handles negative weights |
| Breadth-First Search | No | Fewest hops only | Ignores edge weights entirely |

## Tech stack

- Vanilla JavaScript (no framework)
- HTML5 Canvas for rendering and animation
- CSS custom properties for theming

## Run locally

No build step required.

```bash
git clone https://github.com/<your-username>/pathfinder-console.git
cd pathfinder-console
open index.html   # or just double-click the file
```
## Project structure

```
Path-Finder-Engine/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Author

Built by [Feroz Hasnain](https://github.com/Ferozhasnain1504/)
