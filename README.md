# Air Hockey v0.02

An installable web app (PWA). Static files only: no build step, no server code.

```
index.html             the whole game
sw.js                  service worker: offline cache + update handling
manifest.webmanifest   app name, colours, icons
icons/                 app icon in every size iOS, Android and desktop ask for
```

## Hosting

Service workers only run over HTTPS (or on `localhost`), so opening `index.html` straight from disk plays the game but won't install it. Any static host works:

- **Netlify Drop:** drag this folder onto app.netlify.com/drop.
- **GitHub Pages:** push the folder to a repo and turn on Pages.
- **Locally:** run `npx serve .` in this folder, then open `http://localhost:3000`.

The app uses relative paths, so it can live at a domain root or in a subfolder.

## Installing

- **iPhone / iPad:** open the link in Safari, tap Share, then **Add to Home Screen**.
- **Android:** Chrome offers **Install app** in its menu, sometimes as a banner.
- **Desktop Chrome / Edge:** use the install icon in the address bar.

After the first launch the game works offline. Online play still needs a connection.

## Shipping an update

1. Make your changes.
2. Bump the version in **both** places, to the same value:
   - `sw.js`: `const VERSION = '0.02';`
   - `index.html`: `const APP_VERSION = '0.02';`
3. Upload the files.

**How players get it:**
- Open copies check for updates on launch, when the app comes back to the foreground, and every 30 minutes.
- When a new version is found, it downloads in the background.
- Players then see **"A new version is ready · Update"**. The prompt never appears mid-game; it waits for the menu.
- Tapping Update reloads straight into the new version.
- The menu shows the version number, so you can confirm which one is running.

**Cache busting:**
- The new service worker re-downloads every app file with a versioned URL and `cache: 'reload'`, so browser and CDN caches can't serve stale copies.
- Each version keeps its files in its own cache, and old caches are deleted on activation.
- three.js is pinned to `0.170.0`, so it's cached once and kept between versions. If you change the three.js version, update it in both `index.html` (import map) and `sw.js` (`CDN` list).

## Settings

**Air pressure** is in Settings on the home screen and in the in-game menu (the round button at the top right).
- More air: the puck floats, glides further and reaches higher top speeds.
- Less air: it drags on the surface and settles.
- The default is 60%.
- In an online match, the player who started the match sets it for both players.

**Sound** can be switched off in the same places. Both settings are remembered on the device.

## iOS notes

- The app fills the whole screen, down past the home indicator.
- A soft shade under the status bar keeps the clock readable.
- The game keeps clear of the notch, the status bar and the home indicator.
- Pinch-zoom, double-tap zoom, text selection and rubber-band scrolling are turned off.
- The screen stays awake during a game where iOS allows it.
- For two-player mode on a phone lying flat, turn on Portrait Orientation Lock in Control Center, so the screen doesn't flip as the phone is passed around.
- iOS mutes web audio when the ringer switch is on silent.
