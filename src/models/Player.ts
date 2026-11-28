import type { AudioTrack, Rendition, SegmentReport, StreamInfo, SubtitleTrack } from './Stream';

/** What a player reports while it plays a stream. */
export type PlayerEvents = {
    /** The name of the player, for example `hls.js 1.5.17`. */
    onEngine: (engine: string) => void;
    /** The renditions of the manifest, in the order of the player. */
    onRenditions: (renditions: Rendition[]) => void;
    /** The place, in the list of renditions, of the rendition on screen. */
    onPlayingRendition: (index: number) => void;
    onSubtitles: (tracks: SubtitleTrack[]) => void;
    /**
     * The subtitle track on screen changed. -1 when the subtitles are hidden.
     * It is reported for a choice made with the page and for one made with the controls of the video.
     */
    onSelectedSubtitle: (index: number) => void;
    /** `selected` is the place of the track that plays. */
    onAudioTracks: (tracks: AudioTrack[], selected: number) => void;
    /** A part of the information on the stream. It is added to what was reported before. */
    onInfo: (info: StreamInfo) => void;
    onSegment: (segment: SegmentReport) => void;
    onLog: (message: string, isError?: boolean) => void;
};

/** The controls of a stream that is playing. */
export type PlayerHandle = {
    /** `false` when the browser plays the stream itself and gives no control on the rendition. */
    canSelectRendition: boolean;
    /** Makes the player stay on one rendition. -1 lets the player choose again. */
    selectRendition: (index: number) => void;
    /** Shows one subtitle track. -1 hides the subtitles. */
    selectSubtitle: (index: number) => void;
    selectAudioTrack: (index: number) => void;
    /** The speed of the network that the player measured, in bits per second. The player chooses the rendition from it. */
    getBandwidthEstimate: () => number | undefined;
    /** Stops the stream and frees the video element. */
    destroy: () => void;
};

/** Loads the player library, then starts the stream in the video element. */
export type StartPlayer = (video: HTMLVideoElement, url: string, events: PlayerEvents) => Promise<PlayerHandle>;
