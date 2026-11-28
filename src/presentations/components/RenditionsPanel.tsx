import { ChoiceList } from './ChoiceList';
import { Hint } from './Hint';
import { Panel } from './Panel';
import { formatBitrate, formatResolution } from '../../helpers/format';
import type { Rendition } from '../../models/Stream';

type RenditionsPanelProps = {
    isLoaded: boolean;
    /** `undefined` until the player reports the renditions. */
    renditions: Rendition[] | undefined;
    /** The rendition that the user chose. -1 is "Auto". */
    selected: number;
    /** The rendition on screen. -1 when not known. */
    playing: number;
    /** `false` when the browser plays the stream itself and gives no control on the rendition. */
    canSelect: boolean;
    onSelect: (index: number) => void;
};

/** One button per rendition of the manifest, to make the player stay on it. */
export const RenditionsPanel = ({
    isLoaded,
    renditions,
    selected,
    playing,
    canSelect,
    onSelect,
}: RenditionsPanelProps) => (
    <Panel title="Renditions" count={renditions ? `(${renditions.length})` : undefined}>
        {!isLoaded ? (
            <Hint>Load a stream to see the renditions of its manifest.</Hint>
        ) : !renditions ? (
            <Hint>The player did not report the renditions of this stream.</Hint>
        ) : renditions.length === 0 ? (
            <Hint>The player found no video rendition in this stream.</Hint>
        ) : (
            <div className="flex flex-col gap-3">
                <ChoiceList
                    label="Renditions"
                    choices={[
                        { index: -1, label: 'Auto' },
                        ...renditions.map((rendition, index) => ({
                            index,
                            label: formatResolution(rendition),
                            detail: formatBitrate(rendition.bitrate),
                        })),
                    ]}
                    selected={selected}
                    playing={playing}
                    disabled={!canSelect}
                    onSelect={onSelect}
                />
                <Hint size="small">
                    The green mark is the rendition being played. Choose one to make the player stay on it.
                </Hint>
            </div>
        )}
    </Panel>
);
