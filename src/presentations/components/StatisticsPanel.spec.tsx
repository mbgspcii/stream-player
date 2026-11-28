import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RenditionDummy } from '../../_tests/RenditionDummy';
import type { LiveStats } from '../hooks/useVideoStats';

import { StatisticsPanel } from './StatisticsPanel';

const LiveStatsDummy = {
    create: (overrides?: Omit<Partial<LiveStats>, 'video'> & { video?: Partial<LiveStats['video']> }): LiveStats => ({
        bandwidthEstimate: 4_200_000,
        stalls: 0,
        ...overrides,
        video: {
            bufferSeconds: 23.04,
            droppedFrames: 0,
            totalFrames: 285,
            videoWidth: 1486,
            videoHeight: 720,
            displayedWidth: 880,
            displayedHeight: 426,
            devicePixelRatio: 2,
            deviceWidth: 1760,
            deviceHeight: 852,
            scale: 852 / 720,
            ...overrides?.video,
        },
    }),
};

/** The value shown next to a name. */
const valueOf = (label: string) =>
    screen.getByText(label).closest('[role="listitem"]')?.textContent?.slice(label.length);

describe(StatisticsPanel.name, () => {
    it('should show how the stream plays', () => {
        render(
            <StatisticsPanel
                stats={LiveStatsDummy.create()}
                playing={RenditionDummy.create({
                    width: 1486,
                    height: 720,
                    bitrate: 2_533_000,
                    frameRate: 30,
                    codecs: 'avc1.640020, mp4a.40.2',
                })}
                renditionSwitches={2}
            />,
        );

        expect(valueOf('Rendition on screen')).toBe('1486x720 · 2533 kb/s · 30 fps · avc1.640020, mp4a.40.2');
        expect(valueOf('Network speed measured')).toBe('4200 kb/s');
        expect(valueOf('Loaded ahead')).toBe('23.0 s');
        expect(valueOf('Dropped frames')).toBe('0 of 285');
        expect(valueOf('Rendition switches')).toBe('2');
        expect(valueOf('Stalls')).toBe('0');
        expect(valueOf('Picture decoded')).toBe('1486x720');
        expect(valueOf('Size on the page')).toBe('880x426 CSS pixels');
        expect(valueOf('Device pixel ratio')).toBe('2');
        expect(valueOf('Size on the screen')).toBe('1760x852 screen pixels: the picture is enlarged 1.18x');
    });

    it('should say what is not known before the first picture', () => {
        render(
            <StatisticsPanel
                stats={LiveStatsDummy.create({
                    bandwidthEstimate: undefined,
                    video: { videoWidth: 0, videoHeight: 0, displayedWidth: 0, displayedHeight: 0, scale: undefined },
                })}
                playing={undefined}
                renditionSwitches={0}
            />,
        );

        expect(valueOf('Rendition on screen')).toBe('not known yet');
        expect(valueOf('Network speed measured')).toBe('not known yet');
        expect(valueOf('Picture decoded')).toBe('not known yet');
        expect(valueOf('Size on the page')).toBe('not known yet');
        expect(valueOf('Size on the screen')).toBe('not known yet');
    });

    it('should say when the browser does not count the frames', () => {
        render(
            <StatisticsPanel
                stats={LiveStatsDummy.create({ video: { droppedFrames: undefined, totalFrames: undefined } })}
                playing={undefined}
                renditionSwitches={0}
            />,
        );

        expect(valueOf('Dropped frames')).toBe('not given by this browser');
    });

    it('should draw the eye to dropped frames and to stalls', () => {
        render(
            <StatisticsPanel
                stats={LiveStatsDummy.create({ stalls: 3, video: { droppedFrames: 12 } })}
                playing={undefined}
                renditionSwitches={0}
            />,
        );

        expect(screen.getByText('12 of 285').className).toContain('text-warning');
        expect(screen.getByText('3').className).toContain('text-warning');
    });

    it('should wait for a stream', () => {
        render(<StatisticsPanel stats={undefined} playing={undefined} renditionSwitches={0} />);

        expect(screen.getByText('Load a stream to see how it plays.')).toBeInTheDocument();
        expect(screen.queryByRole('list', { name: 'Statistics' })).not.toBeInTheDocument();
    });
});
