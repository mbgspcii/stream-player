/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** The stream that the page loads when its address gives none. Set in `.env`, see `.env.example`. */
    readonly VITE_DEFAULT_STREAM_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
