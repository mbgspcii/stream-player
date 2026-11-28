import { Panel } from './Panel';
import { ScrollingLines } from './ScrollingLines';
import type { LogLine } from '../hooks/useStreamPlayer';

/** What the page and the player did: the stream loaded, the tracks found, the choices made, the errors. */
export const LogPanel = ({ lines }: { lines: LogLine[] }) => (
    <Panel title="Log">
        <ScrollingLines label="Log" lines={lines} />
    </Panel>
);
