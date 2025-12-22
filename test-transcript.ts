import { getSubtitles } from 'youtube-caption-extractor';

const videoId = 'eur8dUO9mvE';

async function test() {
    console.log('Testing youtube-caption-extractor...');
    try {
        const subtitles = await getSubtitles({ videoID: videoId, lang: 'en' });
        console.log('Transcript length:', subtitles.length);
        if (subtitles.length > 0) {
            console.log('First segment:', subtitles[0]);
        }
    } catch (e) {
        console.error('Failed:', e.message);
    }
}

test();
