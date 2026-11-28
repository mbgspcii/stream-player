import { Facts, type Fact } from './Facts';
import { Hint } from './Hint';
import { Panel } from './Panel';
import { describeAudioTracks, formatDuration } from '../../helpers/format';
import type { AudioTrack, StreamInfo } from '../../models/Stream';

type StreamPanelProps = {
    isLoaded: boolean;
    info: StreamInfo;
    audioTracks: AudioTrack[];
};

const UNKNOWN = 'not known yet';

const describeInfo = (info: StreamInfo, audioTracks: AudioTrack[]): Fact[] => [
    { label: 'Kind', value: info.isLive === undefined ? UNKNOWN : info.isLive ? 'Live' : 'On demand' },
    {
        label: 'Duration',
        value: info.isLive ? 'none: the stream is live' : info.duration ? formatDuration(info.duration) : UNKNOWN,
    },
    {
        label: 'Longest segment',
        value: info.segmentDuration
            ? `${Number(info.segmentDuration.toFixed(2))} s`
            : info.isLive === undefined
              ? UNKNOWN
              : 'not given by the manifest',
    },
    { label: 'Audio', value: describeAudioTracks(audioTracks) },
    {
        label: 'Encryption',
        value: !info.encryption ? UNKNOWN : info.encryption.length === 0 ? 'none' : info.encryption.join(', '),
        tone: info.encryption?.length ? 'warning' : 'default',
    },
];

/** What the manifest says about the stream as a whole. */
export const StreamPanel = ({ isLoaded, info, audioTracks }: StreamPanelProps) => (
    <Panel title="Stream">
        {isLoaded ? (
            <Facts label="Stream" facts={describeInfo(info, audioTracks)} />
        ) : (
            <Hint>Load a stream to see what its manifest says.</Hint>
        )}
    </Panel>
);
