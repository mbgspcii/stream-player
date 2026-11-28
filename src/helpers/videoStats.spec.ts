import { describe, expect, it } from 'vitest';

import { describeScale, fitInside, readBufferAhead, readVideoStats } from './videoStats';

/** The loaded ranges of a video, from `[start, end]` pairs in seconds. */
const timeRanges = (...ranges: [number, number][]): TimeRanges => ({
    length: ranges.length,
    start: (index) => ranges[index][0],
    end: (index) => ranges[index][1],
});

/** A video element with the values that the statistics read. */
const createVideo = (values: {
    videoWidth: number;
    videoHeight: number;
    clientWidth: number;
    clientHeight: number;
    currentTime?: number;
    buffered?: TimeRanges;
    quality?: { droppedVideoFrames: number; totalVideoFrames: number };
}): HTMLVideoElement => {
    const video = document.createElement('video');
    const define = (name: string, value: unknown) => Object.defineProperty(video, name, { value, configurable: true });
    define('videoWidth', values.videoWidth);
    define('videoHeight', values.videoHeight);
    define('clientWidth', values.clientWidth);
    define('clientHeight', values.clientHeight);
    define('currentTime', values.currentTime ?? 0);
    define('buffered', values.buffered ?? timeRanges());
    define('getVideoPlaybackQuality', values.quality ? () => values.quality : undefined);
    return video;
};

describe(fitInside.name, () => {
    it('should fill the width of a box that is too tall', () => {
        expect(fitInside(1920, 1080, 880, 600)).toEqual({ width: 880, height: 495 });
    });

    it('should fill the height of a box that is too wide', () => {
        expect(fitInside(1486, 720, 880, 300)).toEqual({ width: 619, height: 300 });
    });

    it('should give no size without a picture or without a box', () => {
        expect(fitInside(0, 0, 880, 495)).toEqual({ width: 0, height: 0 });
        expect(fitInside(1920, 1080, 0, 0)).toEqual({ width: 0, height: 0 });
    });
});

describe(readBufferAhead.name, () => {
    it('should give the seconds loaded after the current time, in the range that holds it', () => {
        expect(readBufferAhead(timeRanges([0, 12], [30, 60]), 40)).toBe(20);
    });

    it('should give 0 when no range holds the current time', () => {
        expect(readBufferAhead(timeRanges([0, 12]), 20)).toBe(0);
        expect(readBufferAhead(timeRanges(), 0)).toBe(0);
    });
});

describe(readVideoStats.name, () => {
    it('should give the size of the picture on the page and on the screen, and its scale', () => {
        const video = createVideo({
            videoWidth: 1486,
            videoHeight: 720,
            clientWidth: 880,
            clientHeight: 495,
            currentTime: 5,
            buffered: timeRanges([0, 28]),
            quality: { droppedVideoFrames: 3, totalVideoFrames: 285 },
        });

        expect(readVideoStats(video, 2)).toEqual({
            bufferSeconds: 23,
            droppedFrames: 3,
            totalFrames: 285,
            videoWidth: 1486,
            videoHeight: 720,
            displayedWidth: 880,
            displayedHeight: 426,
            devicePixelRatio: 2,
            deviceWidth: 1760,
            deviceHeight: 852,
            scale: 852 / 720,
        });
    });

    it('should give no scale before the first picture, and no frames in a browser that does not count them', () => {
        const video = createVideo({ videoWidth: 0, videoHeight: 0, clientWidth: 880, clientHeight: 150 });

        expect(readVideoStats(video, 1)).toMatchObject({
            bufferSeconds: 0,
            droppedFrames: undefined,
            totalFrames: undefined,
            displayedWidth: 0,
            displayedHeight: 0,
            scale: undefined,
        });
    });
});

describe(describeScale.name, () => {
    it('should say when the picture is enlarged', () => {
        expect(describeScale(852 / 720)).toBe('enlarged 1.18x');
    });

    it('should say when the picture is reduced', () => {
        expect(describeScale(990 / 2160)).toBe('reduced 2.18x');
    });

    it('should say exact size for a difference under 5%', () => {
        expect(describeScale(1)).toBe('exact size');
        expect(describeScale(1.04)).toBe('exact size');
        expect(describeScale(0.96)).toBe('exact size');
    });
});
