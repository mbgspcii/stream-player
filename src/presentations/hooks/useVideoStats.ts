import { useEffect, useState, type RefObject } from 'react';

import { readVideoStats } from '../../helpers/videoStats';
import type { VideoStats } from '../../models/VideoStats';

export type LiveStats = {
    video: VideoStats;
    /** The speed of the network that the player measured, in bits per second. */
    bandwidthEstimate?: number;
    /** How many times the playback stopped to wait for data, since the stream was loaded. */
    stalls: number;
};

const REFRESH_MILLISECONDS = 1000;

/**
 * Reads the statistics of the video element once per second while a stream is loaded.
 * `streamUrl` is empty when no stream is loaded. The counters start again when it changes.
 */
export const useVideoStats = (
    videoRef: RefObject<HTMLVideoElement>,
    streamUrl: string,
    getBandwidthEstimate: () => number | undefined,
): LiveStats | undefined => {
    const [stats, setStats] = useState<LiveStats>();

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !streamUrl) {
            setStats(undefined);
            return;
        }

        let stalls = 0;
        const read = () =>
            setStats({
                video: readVideoStats(video, window.devicePixelRatio || 1),
                bandwidthEstimate: getBandwidthEstimate(),
                stalls,
            });

        // `waiting` also comes at the start and after a seek, which are not stalls.
        let hasPlayed = false;
        const onPlaying = () => {
            hasPlayed = true;
        };
        const onWaiting = () => {
            if (hasPlayed && !video.seeking) {
                stalls++;
                read();
            }
        };

        video.addEventListener('playing', onPlaying);
        video.addEventListener('waiting', onWaiting);
        read();
        const timer = window.setInterval(read, REFRESH_MILLISECONDS);

        return () => {
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('waiting', onWaiting);
            window.clearInterval(timer);
        };
    }, [videoRef, streamUrl, getBandwidthEstimate]);

    return stats;
};
