import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { StreamPlayerView } from './presentations/views/StreamPlayerView';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <StreamPlayerView />
    </StrictMode>,
);
