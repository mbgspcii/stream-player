import type { VideoStats } from '../models/VideoStats';

/** The size of a picture that keeps its proportions inside a box, as `object-fit: contain` does. */
export const fitInside = (
    width: number,
    height: number,
    boxWidth: number,
    boxHeight: number,
): { width: number; height: number } => {
    if (width <= 0 || height <= 0 || boxWidth <= 0 || boxHeight <= 0) {
        return { width: 0, height: 0 };
    }
    const ratio = Math.min(boxWidth / width, boxHeight / height);
    return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
};

/** The seconds that are loaded after `currentTime`, in the range that holds it. 0 when no range holds it. */
export const readBufferAhead = (buffered: TimeRanges, currentTime: number): number => {
    for (let index = 0; index < buffered.length; index++) {
        if (buffered.start(index) <= currentTime && currentTime <= buffered.end(index)) {
            return buffered.end(index) - currentTime;
        }
    }
    return 0;
};

export const readVideoStats = (video: HTMLVideoElement, devicePixelRatio: number): VideoStats => {
    const displayed = fitInside(video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight);
    const quality = typeof video.getVideoPlaybackQuality === 'function' ? video.getVideoPlaybackQuality() : undefined;
    const deviceHeight = Math.round(displayed.height * devicePixelRatio);

    return {
        bufferSeconds: readBufferAhead(video.buffered, video.currentTime),
        droppedFrames: quality?.droppedVideoFrames,
        totalFrames: quality?.totalVideoFrames,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        displayedWidth: displayed.width,
        displayedHeight: displayed.height,
        devicePixelRatio,
        deviceWidth: Math.round(displayed.width * devicePixelRatio),
        deviceHeight,
        scale: video.videoHeight > 0 && deviceHeight > 0 ? deviceHeight / video.videoHeight : undefined,
    };
};

/** `enlarged 1.5x`, `reduced 2x`, or `exact size` when the difference is under 5%. */
export const describeScale = (scale: number): string => {
    if (scale > 1.05) {
        return `enlarged ${Number(scale.toFixed(2))}x`;
    }
    if (scale < 0.95) {
        return `reduced ${Number((1 / scale).toFixed(2))}x`;
    }
    return 'exact size';
};
