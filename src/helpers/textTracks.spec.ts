import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setTextTracks } from '../_tests/textTracks';
import { findShowingTrack, watchShowingTrack } from './textTracks';

describe(findShowingTrack.name, () => {
    it('should give the place of the track on screen among the subtitle and caption tracks', () => {
        const video = document.createElement('video');
        setTextTracks(video, [
            { label: 'Chapters', language: 'en', mode: 'showing', kind: 'chapters' },
            { label: 'English', language: 'en', mode: 'hidden' },
            { label: 'French', language: 'fr', mode: 'showing', kind: 'captions' },
        ]);

        expect(findShowingTrack(video)).toBe(1);
    });

    it('should give -1 when no subtitle track is on screen', () => {
        const video = document.createElement('video');
        setTextTracks(video, [{ label: 'English', language: 'en', mode: 'hidden' }]);

        expect(findShowingTrack(video)).toBe(-1);
    });
});

describe(watchShowingTrack.name, () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should tell the track on screen once the changes are over, not for each one', () => {
        const video = document.createElement('video');
        const onChange = vi.fn();
        const textTracks = setTextTracks(video, [
            { label: 'English', language: 'en', mode: 'showing' },
            { label: 'French', language: 'fr', mode: 'disabled' },
        ]);
        watchShowingTrack(video, onChange);

        // A player first hides the old track, then shows the new one.
        textTracks.tracks[0].mode = 'disabled';
        textTracks.change();
        vi.advanceTimersByTime(50);
        textTracks.tracks[1].mode = 'showing';
        textTracks.change();

        expect(onChange).not.toHaveBeenCalled();

        vi.advanceTimersByTime(200);

        expect(onChange).toHaveBeenCalledExactlyOnceWith(1);
    });

    it('should tell nothing after the watch is stopped', () => {
        const video = document.createElement('video');
        const onChange = vi.fn();
        const textTracks = setTextTracks(video, [{ label: 'English', language: 'en', mode: 'disabled' }]);
        const stop = watchShowingTrack(video, onChange);

        textTracks.tracks[0].mode = 'showing';
        textTracks.change();
        stop();
        vi.advanceTimersByTime(200);
        textTracks.change();
        vi.advanceTimersByTime(200);

        expect(onChange).not.toHaveBeenCalled();
    });
});
