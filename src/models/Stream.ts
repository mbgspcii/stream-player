export type StreamType = 'dash' | 'hls';

/** A video quality that the manifest lists. */
export type Rendition = {
    width?: number;
    height?: number;
    /** In bits per second. */
    bitrate: number;
    /** The codecs that the manifest announces, for example `avc1.64001f, mp4a.40.2`. */
    codecs?: string;
    /** In frames per second. */
    frameRate?: number;
    /** HLS only: the URL of the playlist of this rendition. */
    url?: string;
};

export type SubtitleTrack = {
    label: string;
    language: string;
};

export type AudioTrack = {
    label: string;
    language: string;
    codec?: string;
    /** The number of channels as the manifest writes it, for example `2` or `6`. */
    channels?: string;
};

/** What the manifest says about the stream as a whole. A player may report it in several parts. */
export type StreamInfo = {
    isLive?: boolean;
    /** In seconds. Not known for a live stream. */
    duration?: number;
    /** The longest duration of a segment that the manifest announces, in seconds. */
    segmentDuration?: number;
    /** The ways the stream is encrypted, for example `AES-128` or `Widevine`. Empty when it is not encrypted. */
    encryption?: string[];
};

/** One request for a segment, finished or failed. */
export type SegmentReport = {
    url: string;
    /** What the segment holds, for example `video`, `audio init` or `video #3`. */
    kind: string;
    bytes?: number;
    /** The time of the download, in milliseconds. */
    milliseconds?: number;
    /** The HTTP status. Not known when the request did not get a response. */
    status?: number;
    failed: boolean;
};
