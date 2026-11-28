import { listenToDashEvents } from '../eventListeners/listenToDashEvents';
import type { StartPlayer } from '../models/Player';

export const startDash: StartPlayer = async (video, url, events) => {
    // A separate file of the build: the page downloads dash.js only for a DASH stream.
    const { default: dashjs } = await import('dashjs');

    const player = dashjs.MediaPlayer().create();

    /** The subtitle track that dash.js was asked to show. -1 when the subtitles are off. */
    let selectedSubtitle = -1;

    const showSubtitle = (index: number) => {
        selectedSubtitle = index;
        player.enableText(index !== -1);
        player.setTextTrack(index);
    };

    const stopListening = listenToDashEvents(player, dashjs.MediaPlayer.events, video, events, {
        getSelected: () => selectedSubtitle,
        show: showSubtitle,
    });

    player.initialize(video, url, false);
    events.onEngine(`dash.js ${player.getVersion()}`);

    return {
        canSelectRendition: true,
        selectRendition: (index) => {
            player.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: index === -1 } } } });
            if (index !== -1) {
                // `true`: replace what is in the buffer, so the chosen rendition shows now.
                player.setQualityFor('video', index, true);
            }
        },
        selectSubtitle: (index) => {
            showSubtitle(index);
            events.onSelectedSubtitle(index);
        },
        selectAudioTrack: (index) => {
            const track = player.getTracksFor('audio')?.[index];
            if (track) {
                player.setCurrentTrack(track);
            }
        },
        getBandwidthEstimate: () => {
            // dash.js gives kilobits per second.
            const kilobits = player.getAverageThroughput('video');
            return Number.isFinite(kilobits) && kilobits > 0 ? kilobits * 1000 : undefined;
        },
        destroy: () => {
            stopListening();
            player.reset();
        },
    };
};
