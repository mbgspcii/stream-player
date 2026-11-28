import { ChoiceList } from './ChoiceList';
import { Hint } from './Hint';
import { Panel } from './Panel';
import type { SubtitleTrack } from '../../models/Stream';

type SubtitlesPanelProps = {
    isLoaded: boolean;
    tracks: SubtitleTrack[];
    /** The track on screen. -1 is "Off". */
    selected: number;
    onSelect: (index: number) => void;
};

/** One button per subtitle track that the player found, and "Off". */
export const SubtitlesPanel = ({ isLoaded, tracks, selected, onSelect }: SubtitlesPanelProps) => (
    <Panel title="Subtitles" count={isLoaded ? `(${tracks.length} track${tracks.length === 1 ? '' : 's'})` : undefined}>
        {!isLoaded ? (
            <Hint>Load a stream to see its subtitle tracks.</Hint>
        ) : tracks.length === 0 ? (
            <Hint>The player found no subtitle track in this stream.</Hint>
        ) : (
            <ChoiceList
                label="Subtitles"
                choices={[
                    { index: -1, label: 'Off' },
                    ...tracks.map((track, index) => ({ index, label: track.label, detail: track.language })),
                ]}
                selected={selected}
                onSelect={onSelect}
            />
        )}
    </Panel>
);
