# NIGHT RUN: CITY OF FOUR

Mobile-first installable web game (PWA). The four supplied photo/audio assets are embedded in index.html.

## Run locally
Open index.html in a modern browser. For PWA installation and offline caching, serve the folder over HTTPS (GitHub Pages works).

## Publish with GitHub Pages
1. Create a GitHub account and a new public repository named night-run-city-four.
2. Upload index.html, manifest.webmanifest, sw.js, icon.svg, and README.md to the repository root.
3. Open Settings → Pages. Under Build and deployment choose Deploy from a branch.
4. Select branch main, folder /(root), then Save.
5. Wait for the Pages URL to appear. Open that HTTPS URL in Chrome on Android.
6. In Chrome, open menu ⋮ → Install app or Add to Home screen.

## Security notes
- Never commit passwords, API keys, private tokens, or personal data.
- This is a client-side game: players can inspect and modify downloaded JavaScript/assets. Obfuscation is not real security.
- Do not put multiplayer authority, account credentials, or anti-cheat secrets in this repository. A future online multiplayer mode needs a trusted server to validate positions, scores, and match state.
- GitHub Pages serves static files; it does not provide a secure game server or hide source code.

## Current build notes
- Mobile rendering defaults are reduced for lower-end Android devices.
- Movement uses acceleration/friction and axis-separated obstacle collision.
- Includes pause/resume, restart, visibility pause, and PWA offline shell.
- Browser-based Three.js prototype, not a native APK.
- 
