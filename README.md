# Stream player

A single page to check a streaming manifest in a browser.

Paste the URL of a manifest and press **Load**:

- the page shows the type of the stream, from the extension of the URL: DASH (`.mpd`) or HLS (`.m3u8`);
- it plays the stream with [dash.js](https://github.com/Dash-Industry-Forum/dash.js) or [hls.js](https://github.com/video-dev/hls.js);
- it lists the subtitle tracks that the player found, with one button per track;
- the log shows the tracks found and the errors of the player.

The loaded URL goes in the address of the page (`?url=…`), so the page can be reloaded or shared with its stream.

## The stream must allow the page

The page reads the stream from the browser.
The server of the stream must send `Access-Control-Allow-Origin` for the manifest, the segments and the subtitle files.

## Run it locally

Open `index.html` in a browser. There is nothing to install and nothing to build.

## Deploy on Netlify

1. Push this repository to GitHub.
2. In Netlify: **Add new site**, **Import an existing project**, then choose the repository.
3. Leave the build command empty. The publish directory is `.` (`netlify.toml` sets it).

Every push to the default branch deploys the site.

## Notes

- The two players are loaded from jsDelivr at a pinned version, with an integrity hash.
  To change a version, change the URL and its hash in `index.html`.
- The page sends no referrer, so the URL of the stream is not sent to jsDelivr or to the server of the stream.
- Nothing is stored and nothing is sent to a server of this site: the page is static.
