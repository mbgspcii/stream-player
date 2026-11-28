import { useEffect, useRef, useState } from 'react';

import { Columns } from '../components/Columns';
import { PageHeader } from '../components/PageHeader';
import { PlayerLayout } from '../components/PlayerLayout';
import { DEFAULT_STREAM_URL } from '../../helpers/defaultStream';
import { readStreamUrl, writeStreamUrl } from '../../helpers/streamUrl';
import { useStreamPlayer } from '../hooks/useStreamPlayer';
import { useVideoStats } from '../hooks/useVideoStats';
import { AudioPanel } from '../components/AudioPanel';
import { LogPanel } from '../components/LogPanel';
import { ManifestPanel } from '../components/ManifestPanel';
import { RenditionsPanel } from '../components/RenditionsPanel';
import { SegmentsPanel } from '../components/SegmentsPanel';
import { StatisticsPanel } from '../components/StatisticsPanel';
import { StreamForm } from '../components/StreamForm';
import { StreamPanel } from '../components/StreamPanel';
import { SubtitlesPanel } from '../components/SubtitlesPanel';
import type { StreamType } from '../../models/Stream';

/** The page: it plays one stream, and puts the parts that describe it around the video. */
export const StreamPlayerView = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { state, log, load, selectRendition, selectSubtitle, selectAudioTrack, getBandwidthEstimate } =
        useStreamPlayer(videoRef);
    const stats = useVideoStats(videoRef, state.type ? state.url : '', getBandwidthEstimate);

    // The stream that the address of the page asks for, or else the default one. Read once when the page opens.
    const [initialUrl] = useState(() => readStreamUrl(window.location.search) || DEFAULT_STREAM_URL);

    // In development, React runs this effect twice: the log then shows two "loading" lines for one stream.
    useEffect(() => {
        if (initialUrl) {
            void load(initialUrl);
        }
    }, [initialUrl, load]);

    const loadFromForm = (url: string, type: StreamType) => {
        // The URL goes in the address bar, so the page can be reloaded or shared with its stream.
        window.history.replaceState(null, '', writeStreamUrl(url));
        void load(url, type);
    };

    return (
        <main>
            <div className="mx-auto max-w-[1400px]">
                <PageHeader />

                <StreamForm
                    initialUrl={initialUrl}
                    isLoaded={state.isLoaded}
                    loadedType={state.type}
                    engine={state.engine}
                    onLoad={loadFromForm}
                />

                <Columns>
                    <>
                        <RenditionsPanel
                            isLoaded={state.isLoaded}
                            renditions={state.renditions}
                            selected={state.selectedRendition}
                            playing={state.playingRendition}
                            canSelect={state.canSelectRendition}
                            onSelect={selectRendition}
                        />
                        <AudioPanel
                            tracks={state.audioTracks}
                            selected={state.selectedAudioTrack}
                            onSelect={selectAudioTrack}
                        />
                    </>
                    <SubtitlesPanel
                        isLoaded={state.isLoaded}
                        tracks={state.subtitles}
                        selected={state.selectedSubtitle}
                        onSelect={selectSubtitle}
                    />
                </Columns>

                <PlayerLayout
                    videoRef={videoRef}
                    aside={
                        <StatisticsPanel
                            stats={stats}
                            playing={state.renditions?.[state.playingRendition]}
                            renditionSwitches={state.renditionSwitches}
                        />
                    }
                >
                    <Columns>
                        <SegmentsPanel isLoaded={state.isLoaded} segments={state.segments} />
                        <LogPanel lines={log} />
                    </Columns>
                    <StreamPanel isLoaded={state.isLoaded} info={state.info} audioTracks={state.audioTracks} />
                    <ManifestPanel key={state.url} url={state.url} renditions={state.renditions ?? []} />
                </PlayerLayout>
            </div>
        </main>
    );
};
