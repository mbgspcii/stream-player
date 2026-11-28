import { Facts, type Fact } from './Facts';
import { Hint } from './Hint';
import { Panel } from './Panel';
import { describeRenditionDetail, formatResolution, formatSpeed } from '../../helpers/format';
import { describeScale } from '../../helpers/videoStats';
import type { LiveStats } from '../hooks/useVideoStats';
import type { Rendition } from '../../models/Stream';

type StatisticsPanelProps = {
    /** `undefined` while no stream is loaded. */
    stats: LiveStats | undefined;
    /** The rendition on screen. Not known before the player reports it. */
    playing: Rendition | undefined;
    renditionSwitches: number;
};

const UNKNOWN = 'not known yet';

const describeStats = (stats: LiveStats, playing: Rendition | undefined, renditionSwitches: number): Fact[] => {
    const { video, bandwidthEstimate, stalls } = stats;
    const hasPicture = video.videoWidth > 0;

    return [
        {
            label: 'Rendition on screen',
            // The only place with the frame rate and the codecs: the buttons of the renditions stay short.
            value: playing ? `${formatResolution(playing)} · ${describeRenditionDetail(playing)}` : UNKNOWN,
        },
        {
            label: 'Network speed measured',
            value: bandwidthEstimate === undefined ? UNKNOWN : formatSpeed(bandwidthEstimate),
        },
        { label: 'Loaded ahead', value: `${video.bufferSeconds.toFixed(1)} s` },
        {
            label: 'Dropped frames',
            value:
                video.droppedFrames === undefined
                    ? 'not given by this browser'
                    : `${video.droppedFrames} of ${video.totalFrames ?? 0}`,
            tone: video.droppedFrames ? 'warning' : 'default',
        },
        { label: 'Rendition switches', value: String(renditionSwitches) },
        { label: 'Stalls', value: String(stalls), tone: stalls > 0 ? 'warning' : 'default' },
        { label: 'Picture decoded', value: hasPicture ? `${video.videoWidth}x${video.videoHeight}` : UNKNOWN },
        {
            label: 'Size on the page',
            value: hasPicture ? `${video.displayedWidth}x${video.displayedHeight} CSS pixels` : UNKNOWN,
        },
        { label: 'Device pixel ratio', value: String(Number(video.devicePixelRatio.toFixed(2))) },
        {
            label: 'Size on the screen',
            value:
                video.scale === undefined
                    ? UNKNOWN
                    : `${video.deviceWidth}x${video.deviceHeight} screen pixels: the picture is ${describeScale(video.scale)}`,
        },
    ];
};

/** What happens while the stream plays. The values are read again each second. */
export const StatisticsPanel = ({ stats, playing, renditionSwitches }: StatisticsPanelProps) => (
    <Panel title="Statistics">
        {stats ? (
            <Facts label="Statistics" facts={describeStats(stats, playing, renditionSwitches)} />
        ) : (
            <Hint>Load a stream to see how it plays.</Hint>
        )}
    </Panel>
);
