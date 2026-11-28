# Stream player

A single page to check a streaming manifest in a browser.

Paste the URL of a manifest and press **Load**. The page shows the type of the stream, from the extension of the URL (DASH for `.mpd`, HLS for `.m3u8`), and plays it with [dash.js](https://github.com/Dash-Industry-Forum/dash.js) or [hls.js](https://github.com/video-dev/hls.js). Under the video, it shows:

- **Statistics**, read again each second: the rendition on screen with its frame rate and its codecs, the network speed that the player measured, the seconds loaded ahead, the dropped frames, the rendition switches and the stalls. It also compares the resolution of the picture with its size on the screen, in real pixels (CSS size times the device pixel ratio), and says if the picture is enlarged or reduced.
- **Log**: the renditions, the tracks found, the choices made and the errors of the player.
- **Renditions**: the resolution and the bitrate of each one, with a mark on the one being played. Each rendition is a button: choose one to make the player stay on it, or **Auto** to let the player choose again.
- **Subtitles**: one button per track that the player found. A subtitle track may also be chosen with the controls of the video: the buttons follow.
- **Audio**: one button per track, when the stream has more than one. A single track is a line of the **Stream** part.
- **Stream**: live or on demand, the duration, the longest segment, the audio and the encryption (AES-128, Widevine, FairPlay, PlayReady).
- **Segments**: the last 50 requests for a segment, with the HTTP status, the size and the time of each one. A failed request is in red.
- **Manifest**: the text of the manifest and, for HLS, of the playlist of each rendition. The page asks the server for the file only when this part is opened.

The buttons of the renditions, of the audio tracks and of the subtitles are above the video. On a wide screen (from 1280 pixels), they are in two columns, the video has the statistics next to it, and the segments and the log are side by side under the video, each in a box of a fixed height that scrolls. On a narrower screen there is one column, and the video sticks to the top of the page, smaller, while the parts under it are read.

The type of the stream is asked only for a URL whose extension does not give it, for example a manifest served by an API. HLS is then chosen first.

A listed rendition is what the manifest announces. To check that its segments exist, choose the rendition and read the **Segments** part.

When its address gives no stream, the page loads a default one, if the `VITE_DEFAULT_STREAM_URL` variable was set when the site was built. Without it, the page opens with no stream.

On your machine, copy `.env.example` to `.env` and write the URL of a stream in it. Git ignores `.env`.

On Netlify, set the variable in **Site configuration**, **Environment variables**, then deploy again. The value is not a secret: Vite writes every `VITE_` value in the public site.

The loaded URL goes in the address of the page (`?stream=…`), so the page can be reloaded or shared with its stream.

The page can also be opened with a stream directly. The URL of the stream may be pasted as it is, without encoding:

```
https://<your-site>.netlify.app/?stream=https://…/master.m3u8
```

All the text after `stream=` is then the URL of the stream, so its own parameters are kept.

The parameter is not named `url`: the development server of Vite keeps `?url` for itself and answers 403 to it. The deployed page reads `?url=` too.

## The stream must allow the page

The page reads the stream from the browser.
The server of the stream must send `Access-Control-Allow-Origin` for the manifest, the segments and the subtitle files.

## Run it locally

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5176.

| Command                | What it does                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `npm run dev`          | Serves the app and reloads it when a file changes.                                         |
| `npm run build`        | Checks the types, then writes the site in `dist/`.                                         |
| `npm run build:watch`  | Writes the site in `dist/` again each time a file changes. It does not check the types.    |
| `npm run preview`      | Serves the build of `dist/`.                                                               |
| `npm run check`        | Runs the four checks below. Run it before a push.                                          |
| `npm run typecheck`    | Checks the types with TypeScript.                                                          |
| `npm run lint`         | Checks the code with [oxlint](https://oxc.rs/docs/guide/usage/linter).                     |
| `npm run format:check` | Checks the format with Prettier. `npm run format` fixes it.                                |
| `npm run test`         | Runs the unit tests with Vitest. `npm run test:watch` runs them again when a file changes. |

## Tests

The specs follow these rules:

- a spec is next to the code it tests and is named `*.spec.ts` or `*.spec.tsx`;
- each `it` starts with `should`;
- the components are tested with React Testing Library, from what the user sees and does;
- the helpers that several specs share (dummies, mocks) are in `src/_tests/`;
- the panels without a spec of their own are tested through the page, in `src/presentations/views/StreamPlayerView.spec.tsx`.

dash.js and hls.js are replaced by fakes, because they cannot play a stream in the test environment (happy-dom). So the specs check what the page asks of the players and what it does with their reports. They do not check that a stream plays: for that, load a stream in a browser.

## Stack

React 18 and TypeScript, built with Vite. The page uses no component library: its few components (a button, a box with a title, a row of choices, a list of facts) are in `src/presentations/components/`.

The look is written with [Tailwind](https://tailwindcss.com) classes. `src/index.css` holds the colors of the page, light and dark, and gives them as classes: `bg-page`, `bg-panel`, `text-muted`, `border-line`, `text-error`. The page follows the color scheme of the system. Prettier sorts the classes.

## Files

```
src/
├── models/            the types of the domain: a stream, a player, the video statistics
├── repositories/      what talks to the outside: starts dash.js or hls.js, asks the server of the stream
├── eventListeners/    listens to a player and reports what it says as the events of the page
├── transformers/      turns what a player gives into the models
├── helpers/           functions without state: texts to show, the URL of the page, the video statistics
├── presentations/     the React part
│   ├── views/         the page: it uses the hooks and puts the components around the video
│   ├── components/    components that get all they show as props (the panels, the buttons, the layout…)
│   ├── hooks/         the React state: the stream that plays, the statistics read each second
│   └── helpers/       what only the components need
└── _tests/            the dummies and the mocks that several specs share
```

- `src/presentations/views/StreamPlayerView.tsx` holds no detail of a panel. To change a part of the page, open its file in `src/presentations/components/`.
- `src/presentations/components/StreamForm.tsx`: the field for the URL, the choice of the type and the "Load" button.
- `src/presentations/components/PlayerLayout.tsx`: the video element, with what is next to it and under it.
- `src/presentations/hooks/useStreamPlayer.ts`: plays one stream and keeps what the player reports.
- `src/repositories/startDash.ts`, `src/repositories/startHls.ts`: one adapter per player. Both give the same controls (`PlayerHandle` in `src/models/Player.ts`).
- `src/eventListeners/`: one listener per player. It turns the events of dash.js, of hls.js or of the video element into the same events (`PlayerEvents` in `src/models/Player.ts`).
- `src/repositories/fetchManifestText.ts`: asks the server of the stream for the text of a manifest.
- `src/transformers/readDashManifest.ts`: what the page reads in an MPD (codecs, frame rates, encryption).
- `src/helpers/streamUrl.ts`: the type of a URL and the `?stream=` parameter of the page.
- `.env.example`: the variables that the build reads, to copy to `.env`. `src/helpers/defaultStream.ts` reads the default stream from it.
- `src/setupTests.ts`: what Vitest runs before each spec file.
- `src/index.css`: the colors of the page, and the line that loads Tailwind.
- `netlify.toml`: how Netlify builds the site, and the response headers that it sends.

## Deploy on Netlify

1. Push this repository to GitHub.
2. In Netlify: **Add new site**, **Import an existing project**, then choose the repository.
3. Keep the build settings that Netlify reads from `netlify.toml`: the command is `npm run build` and the publish directory is `dist`.

Every push to the default branch builds and deploys the site. The build does not run the lint, the format check or the tests: run `npm run check` before a push.

## Notes

- dash.js and hls.js are npm dependencies at a pinned version, built into the site. The page loads nothing from another site.
  To change a version, change it in `package.json` and run `npm install`.
- Each player is a separate file. The page downloads only the one that the stream needs.
- The page sends no referrer, so the URL of the stream is not sent to the server of the stream.
  `netlify.toml` sets this and the other response headers.
- Nothing is stored and nothing is sent to a server of this site: the page is static.
- The page asks the server of the stream for one file by itself: the manifest or a playlist, when the **Manifest** part is opened. All the other requests are made by the player.

## Limits

- With dash.js, the codecs, the frame rates and the encryption are read from the manifest as dash.js keeps it after parsing, and the segments from its `HttpList` metric. Neither is in the typed API of dash.js. They work with the pinned version 4.7.4: check the **Renditions**, **Stream** and **Segments** parts again after a change of version. `src/transformers/readDashManifest.ts` and `src/eventListeners/listenToDashEvents.ts` hold that code.
- On a browser that plays HLS itself, without Media Source Extensions (Safari on iPhone), the page knows only the duration and the statistics of the video element. It cannot list the renditions, the audio tracks or the segments, and it cannot force a rendition.
- A stall is counted when the video waits for data after it started to play, and not after a seek. It is an estimate.
- A stream protected by a DRM system (Widevine, FairPlay, PlayReady) is announced in the **Stream** part, but the page gives no license server to the player, so it is not expected to play. This was not tried on a real protected stream.
