export type FakeTextTrack = { label: string; language: string; mode: string; kind?: string };

/**
 * Gives a video the text tracks of a test, in place of its own list.
 * The list sends the `change` event when `change()` is called, as a browser does after the mode of a track changed.
 */
export const setTextTracks = (video: HTMLVideoElement, tracks: FakeTextTrack[]) => {
    for (const track of tracks) {
        track.kind ??= 'subtitles';
    }
    // The list gives the objects of the test themselves, so the test sees a mode that the code writes.
    const list = Object.assign(new EventTarget(), { [Symbol.iterator]: () => tracks[Symbol.iterator]() });
    Object.defineProperty(video, 'textTracks', { value: list, configurable: true });

    return {
        tracks,
        change: () => list.dispatchEvent(new Event('change')),
    };
};
