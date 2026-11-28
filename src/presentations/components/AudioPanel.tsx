import { ChoiceList } from './ChoiceList';
import { Panel } from './Panel';
import { describeAudioDetail } from '../../helpers/format';
import type { AudioTrack } from '../../models/Stream';

type AudioPanelProps = {
    tracks: AudioTrack[];
    /** The track that plays. -1 when not known. */
    selected: number;
    onSelect: (index: number) => void;
};

/**
 * One button per audio track, when the stream has more than one.
 * With one track there is nothing to choose: it is a line of the "Stream" part, and this part shows nothing.
 */
export const AudioPanel = ({ tracks, selected, onSelect }: AudioPanelProps) =>
    tracks.length > 1 ? (
        <Panel title="Audio" count={`(${tracks.length} tracks)`}>
            <ChoiceList
                label="Audio"
                choices={tracks.map((track, index) => ({
                    index,
                    label: track.label,
                    detail: describeAudioDetail(track),
                }))}
                selected={selected}
                onSelect={onSelect}
            />
        </Panel>
    ) : null;
