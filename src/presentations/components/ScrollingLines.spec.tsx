import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ScrollingLines, type Line } from './ScrollingLines';

const LINES: Line[] = [
    { id: 1, time: '10:00:00', message: 'loading https://cdn.example.com/master.m3u8', isError: false },
    { id: 2, time: '10:00:01', message: 'hls.js error: networkError / manifestLoadError (fatal)', isError: true },
];

describe(ScrollingLines.name, () => {
    it('should show each line with its time', () => {
        render(<ScrollingLines label="Log" lines={LINES} />);

        expect(screen.getByText('10:00:00 loading https://cdn.example.com/master.m3u8')).toBeInTheDocument();
        expect(screen.getByText(/10:00:01 hls\.js error/)).toBeInTheDocument();
    });

    it('should mark only the error lines', () => {
        render(<ScrollingLines label="Log" lines={LINES} />);

        expect(screen.getByText(/hls\.js error/).className).toContain('text-error');
        expect(screen.getByText(/loading/).className).not.toContain('text-error');
    });

    it('should show nothing without lines', () => {
        render(<ScrollingLines label="Log" lines={[]} />);

        expect(within(screen.getByRole('log', { name: 'Log' })).queryAllByText(/\S/)).toHaveLength(0);
    });
});
