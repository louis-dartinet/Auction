# The Deepwoken Draft — Portfolio Demo

A browser-based auction interface built with HTML, CSS, and JavaScript. The original private event version used Firebase Realtime Database for synchronisation.

## Try it

Open the GitHub Pages URL, select **Open demo host dashboard**, or **Join demo auction** to create a captain. All data in this portfolio build is stored in your own browser using `localStorage`. It does **not** connect to the original Firebase project and does **not** synchronise across devices.

## Features

- Auction host dashboard with lots, starting bids, sales, skips, and reset
- Six captain seats with budgets and picks
- Custom and quick bids
- Responsive interface
- Local browser persistence for demonstrations

## Deploy to GitHub Pages

Upload `index.html` and `README.md` to a public repository. Under **Settings → Pages**, choose **Deploy from a branch**, `main`, and `/ (root)`.

## Limitations

This is a portfolio demo, not a secured multiplayer auction. It has no authentication or remote database. The original live implementation would require authenticated access, Firebase security rules, and transactional bidding before public use.
