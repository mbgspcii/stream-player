import { listenToHlsEvents } from '../eventListeners/listenToHlsEvents';
import { listenToNativeHlsEvents } from '../eventListeners/listenToNativeHlsEvents';
import type { PlayerEvents, PlayerHandle, StartPlayer } from '../models/Player';

/** Safari on iPhone: no Media Source Extensions, but the browser plays HLS itself. */
const startNativeHls = (video: HTMLVideoElement, url: string, events: PlayerEvents): PlayerHandle => {
    const stopListening = listenToNativeHlsEvents(video, events);
    video.src = url;
    events.onEngine('the browser (native HLS)');

    return {
        canSelectRendition: false,
        selectRendition: () => undefined,
        selectSubtitle: (index) => {
            [...video.textTracks].forEach((track, i) => {
                track.mode = i === index ? 'showing' : 'disabled';
            });
        },
        selectAudioTrack: () => undefined,
        getBandwidthEstimate: () => undefined,
        destroy: () => {
            stopListening();
            video.removeAttribute('src');
            video.load();
        },
    };
};

export const startHls: StartPlayer = async (video, url, events) => {
    // A separate file of the build: the page downloads hls.js only for an HLS stream.
    const { default: Hls } = await import('hls.js');

    if (!Hls.isSupported()) {
        return startNativeHls(video, url, events);
    }

    const hls = new Hls();
    listenToHlsEvents(hls, Hls.Events, events);

    hls.loadSource(url);
    hls.attachMedia(video);
    events.onEngine(`hls.js ${Hls.version}`);

    return {
        canSelectRendition: true,
        selectRendition: (index) => {
            // -1 gives the choice back to hls.js.
            hls.currentLevel = index;
        },
        selectSubtitle: (index) => {
            // `subtitleDisplay` stays on: when it is off, a track chosen with the controls of the video
            // is loaded but not shown. -1 is enough to hide the subtitles.
            hls.subtitleTrack = index;
        },
        selectAudioTrack: (index) => {
            hls.audioTrack = index;
        },
        getBandwidthEstimate: () => (Number.isFinite(hls.bandwidthEstimate) ? hls.bandwidthEstimate : undefined),
        destroy: () => hls.destroy(),
    };
};
