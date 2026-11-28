/** The text tracks of a video that are subtitles, in the order of the video. */
const subtitleTracks = (video: HTMLVideoElement): TextTrack[] =>
    [...video.textTracks].filter((track) => track.kind === 'subtitles' || track.kind === 'captions');

/** The place of the subtitle track on screen, among the subtitle tracks of the video. -1 when none is shown. */
export const findShowingTrack = (video: HTMLVideoElement): number =>
    subtitleTracks(video).findIndex((track) => track.mode === 'showing');

/** A player changes several tracks to show one: the page reads the result once they are all changed. */
const SETTLE_MILLISECONDS = 200;

/**
 * Tells when the subtitle track on screen changes, whoever changed it: the page, the player,
 * or the user with the subtitle menu in the controls of the video.
 * Gives a function that stops the watch.
 */
export const watchShowingTrack = (video: HTMLVideoElement, onChange: (index: number) => void): (() => void) => {
    let timer: number | undefined;

    const onTracksChange = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => onChange(findShowingTrack(video)), SETTLE_MILLISECONDS);
    };

    video.textTracks.addEventListener('change', onTracksChange);

    return () => {
        window.clearTimeout(timer);
        video.textTracks.removeEventListener('change', onTracksChange);
    };
};
