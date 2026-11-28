/** What the video element says about the picture on screen. */
export type VideoStats = {
    /** The seconds of video that are loaded after the current position. */
    bufferSeconds: number;
    /** Not known in a browser without `getVideoPlaybackQuality`. */
    droppedFrames?: number;
    totalFrames?: number;
    /** The resolution of the picture that is decoded. 0 before the first picture. */
    videoWidth: number;
    videoHeight: number;
    /** The size of the picture on the page, in CSS pixels, without the black bands around it. */
    displayedWidth: number;
    displayedHeight: number;
    devicePixelRatio: number;
    /** The size of the picture on the screen, in the real pixels of the screen. */
    deviceWidth: number;
    deviceHeight: number;
    /** Screen pixels per video pixel. Above 1, the picture is enlarged. Not known before the first picture. */
    scale?: number;
};
