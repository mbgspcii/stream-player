import { watchShowingTrack } from '../helpers/textTracks';
import type { PlayerEvents } from '../models/Player';

/**
 * Listens to a video element that plays HLS itself, and reports what it says as the events of the page.
 * Gives the function that stops the listening.
 */
export const listenToNativeHlsEvents = (video: HTMLVideoElement, events: PlayerEvents): (() => void) => {
    const onLoadedMetadata = () => {
        events.onSubtitles(
            [...video.textTracks].map((track) => ({ label: track.label || track.language, language: track.language })),
        );
        if (Number.isFinite(video.duration)) {
            events.onInfo({ isLive: false, duration: video.duration });
        } else {
            events.onInfo({ isLive: true });
        }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    // The user may also choose a track with the controls of the video.
    const stopWatch = watchShowingTrack(video, (index) => events.onSelectedSubtitle(index));

    return () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        stopWatch();
    };
};
