import { Hint } from './Hint';
import { Panel } from './Panel';
import { ScrollingLines } from './ScrollingLines';
import { describeSegment } from '../../helpers/format';
import { MAX_SEGMENTS, type SegmentLine } from '../hooks/useStreamPlayer';

type SegmentsPanelProps = {
    isLoaded: boolean;
    segments: SegmentLine[];
};

/** The last requests for a segment. A failed request is in red: its rendition is listed but that part is missing. */
export const SegmentsPanel = ({ isLoaded, segments }: SegmentsPanelProps) => (
    <Panel title="Segments" count={isLoaded ? `(the last ${MAX_SEGMENTS})` : undefined}>
        {!isLoaded ? (
            <Hint>Load a stream to see the segments that the player asks for.</Hint>
        ) : segments.length === 0 ? (
            <Hint>No segment was requested yet. Press play.</Hint>
        ) : (
            <ScrollingLines
                label="Segments"
                lines={segments.map((segment) => ({
                    id: segment.id,
                    time: segment.time,
                    message: describeSegment(segment),
                    isError: segment.failed,
                }))}
            />
        )}
    </Panel>
);
