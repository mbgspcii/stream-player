import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SegmentLine } from '../hooks/useStreamPlayer';

import { describeSegment } from '../../helpers/format';

import { SegmentsPanel } from './SegmentsPanel';

const SegmentLineDummy = {
    create: (overrides?: Partial<SegmentLine>): SegmentLine => ({
        id: 1,
        time: '10:00:00',
        url: 'https://cdn.example.com/video/720p/segment_3.m4s',
        kind: 'video',
        bytes: 512_000,
        milliseconds: 120,
        status: 200,
        failed: false,
        ...overrides,
    }),
};

describe(describeSegment.name, () => {
    it('should give the status, the kind, the size, the time and the end of the URL', () => {
        expect(describeSegment(SegmentLineDummy.create())).toBe(
            'HTTP 200 · video · 512 kB · 120 ms · 720p/segment_3.m4s',
        );
    });

    it('should leave out what is not known', () => {
        expect(
            describeSegment(SegmentLineDummy.create({ status: undefined, bytes: undefined, milliseconds: undefined })),
        ).toBe('video · 720p/segment_3.m4s');
    });

    it('should say when a failed request got no response', () => {
        expect(
            describeSegment(
                SegmentLineDummy.create({ failed: true, status: undefined, bytes: undefined, milliseconds: undefined }),
            ),
        ).toBe('no response · video · 720p/segment_3.m4s');
    });
});

describe(SegmentsPanel.name, () => {
    it('should say that nothing was requested yet', () => {
        render(<SegmentsPanel isLoaded segments={[]} />);

        expect(screen.getByText('No segment was requested yet. Press play.')).toBeInTheDocument();
        expect(screen.queryByRole('log')).not.toBeInTheDocument();
    });

    it('should show one line per segment, with its time', () => {
        render(<SegmentsPanel isLoaded segments={[SegmentLineDummy.create()]} />);

        expect(screen.getByRole('log', { name: 'Segments' })).toBeInTheDocument();
        expect(
            screen.getByText('10:00:00 HTTP 200 · video · 512 kB · 120 ms · 720p/segment_3.m4s'),
        ).toBeInTheDocument();
    });

    it('should mark only a failed segment', () => {
        render(
            <SegmentsPanel
                isLoaded
                segments={[
                    SegmentLineDummy.create({ id: 1 }),
                    SegmentLineDummy.create({ id: 2, status: 404, failed: true, bytes: undefined }),
                ]}
            />,
        );

        expect(screen.getByText(/HTTP 404/).className).toContain('text-error');
        expect(screen.getByText(/HTTP 200/).className).not.toContain('text-error');
    });

    it('should wait for a stream', () => {
        render(<SegmentsPanel isLoaded={false} segments={[]} />);

        expect(screen.getByText('Load a stream to see the segments that the player asks for.')).toBeInTheDocument();
    });
});
