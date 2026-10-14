# Connect the live Deepwoken draft

The new app uses your existing pufferfish-conquest Firebase project, with a separate `deepwokenV2` data path. It does not migrate or overwrite the old auction data.

1. In Firebase Console, open Authentication → Sign-in method. Enable Anonymous and Save. Players will never see a sign-in form, password prompt, email verification, or Google popup. Firebase creates a browser identity silently.
2. Under Realtime Database → Rules, replace the expired test rules with the complete contents of `database.rules.json`, then Publish. The rules enable only the new auction paths; unrelated existing paths remain inaccessible.
3. Open the auction at https://louis-dartinet.github.io/Auction/. Open Host access and copy the displayed host browser ID.
4. In Realtime Database → Data, add a top-level object `auctionHosts`. Under it, add your exact browser ID as the key and the Boolean value `true` (not the text "true"). Only project administrators using the console can grant this permission.
5. Reload the auction website, then Host access → Initialise draft.
6. Friends open the website, enter a captain name, and wait for you to approve the request on the host dashboard. Up to six captains receive 30,000 notes each. They resume their seat automatically in the same browser.

Anonymous IDs belong to the browser. Clearing site data, switching browser/device, or using a new private window creates a different ID, so the existing seat or host permission will not follow automatically. The project owner can grant a new host browser ID through Firebase Console. Keep the host browser's site data intact during the event.

## Running the draft

Select Start / resume to open the current lot for 20 seconds. Each bid must raise the price by at least 100 notes; the initial bid may equal the opening price. Bids in the final five seconds extend the deadline to five seconds from that bid. The rules allow a 500 ms clock-offset tolerance; they reject all bids arriving after the existing deadline.

Keep a host dashboard open. Its timer records the winner and updates budgets using one whole-ledger Firebase transaction. If the host disconnects, the database rejects late bids at the deadline; sale settlement resumes when a host reconnects. This implementation does not include a continuously running server worker, so it does not guarantee immediate settlement while all hosts are offline or browser timers are suspended.

Pause, undo the latest bid, restart the round, skip unsold lots, reopen skipped lots using Next lot, and export results from the host dashboard. Reset clears sales and bids but retains approved captain accounts and their seats. Captains cannot modify budgets, rosters, timers beyond the allowed late-bid extension, previous bid history, or host permissions.

## Validation and deployment

The browser configuration is public Firebase web configuration, not a service-account credential. Rules and anonymous browser IDs enforce permissions. No service-account private key is required in this app.

The Firebase console was not accessible from the agent's browser, so the live rules and Authentication provider have not been changed, and no live end-to-end Firebase test was possible. Tests simulate transactions and rule predicates locally; publish the rules and verify two separate browser sessions before your event. GitHub Pages deploys the updated HTML from the main branch.

## Roblox fighters on Netlify

Deploy the complete folder containing index.html and _redirects, rather than just the HTML file. The supplied deepwoken-netlify.zip contains those two files at its root; extract it and upload the extracted folder to your existing Netlify project. The proxy routes let the browser retrieve public Roblox profile information and avatars without a third-party CORS service or Roblox login.

On the host dashboard, enter a numeric Roblox user ID or profile URL, then Add / update fighter. The real Roblox username and headshot are fetched automatically. The default option matches an existing username or adds a new pending lot; alternatively, choose an unbid lot to update. Duplicate user IDs are rejected. If Roblox has not generated a thumbnail or blocks it, initials appear and the host can retry Refresh current avatar. Resetting the draft retains configured fighter names, Roblox IDs, and avatars.

Avatars require the Netlify proxy: GitHub Pages alone does not implement _redirects. Live Roblox/Netlify lookup has not been verified from the agent browser.
