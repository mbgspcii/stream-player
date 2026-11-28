/**
 * Asks the server for a manifest or a playlist, and gives its text.
 * The address of the page holds the URL of the stream: it is not sent as the referrer.
 */
export const fetchManifestText = async (url: string): Promise<string> => {
    const response = await fetch(url, { referrerPolicy: 'no-referrer' });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
};
