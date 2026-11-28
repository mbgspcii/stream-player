import { act, renderHook } from '@testing-library/react';
import { type RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVideoStats } from './useVideoStats';

const STREAM_URL = 'https://cdn.example.com/video/master.m3u8';

const renderStats = (initialUrl: string, getBandwidthEstimate: () => number | undefined = () => undefined) => {
    const video = document.createElement('video');
    const videoRef: RefObject<HTMLVideoElement> = { current: video };
    const hook = renderHook(({ url }) => useVideoStats(videoRef, url, getBandwidthEstimate), {
        initialProps: { url: initialUrl },
    });
    return { ...hook, video };
};

describe(useVideoStats.name, () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should give nothing while no stream is loaded', () => {
        const { result } = renderStats('');

        expect(result.current).toBeUndefined();
    });

    it('should read the statistics when a stream is loaded, then again each second', () => {
        const getBandwidthEstimate = vi.fn<() => number | undefined>(() => undefined);
        const { result } = renderStats(STREAM_URL, getBandwidthEstimate);

        expect(result.current).toMatchObject({ stalls: 0, bandwidthEstimate: undefined });
        expect(result.current?.video.devicePixelRatio).toBe(window.devicePixelRatio || 1);

        getBandwidthEstimate.mockReturnValue(4_200_000);
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(result.current?.bandwidthEstimate).toBe(4_200_000);
    });

    it('should count a wait for data as a stall only once the video played and when the user did not seek', () => {
        const { result, video } = renderStats(STREAM_URL);

        // The wait at the start is not a stall.
        act(() => {
            video.dispatchEvent(new Event('waiting'));
        });
        expect(result.current?.stalls).toBe(0);

        act(() => {
            video.dispatchEvent(new Event('playing'));
            video.dispatchEvent(new Event('waiting'));
        });
        expect(result.current?.stalls).toBe(1);

        // The wait after a seek is not a stall.
        Object.defineProperty(video, 'seeking', { value: true });
        act(() => {
            video.dispatchEvent(new Event('waiting'));
        });
        expect(result.current?.stalls).toBe(1);
    });

    it('should start the counters again for another stream, and stop when no stream is loaded', () => {
        const { result, video, rerender } = renderStats(STREAM_URL);
        act(() => {
            video.dispatchEvent(new Event('playing'));
            video.dispatchEvent(new Event('waiting'));
        });
        expect(result.current?.stalls).toBe(1);

        rerender({ url: 'https://cdn.example.com/video/other.m3u8' });
        expect(result.current?.stalls).toBe(0);

        rerender({ url: '' });
        expect(result.current).toBeUndefined();
    });
});
