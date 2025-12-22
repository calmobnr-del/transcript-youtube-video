import { NextApiRequest, NextApiResponse } from 'next';
import { getSubtitles } from 'youtube-caption-extractor';
import ytdl from 'ytdl-core';
import fs from 'fs-extra';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ message: 'URL is required' });
    }

    try {
        // 1. Get video info (title)
        const info = await ytdl.getBasicInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '_'); // Basic sanitization

        // 2. Fetch transcript
        console.log(`Fetching transcript for URL: ${url}`);
        // Extract video ID from URL
        const videoId = info.videoDetails.videoId;
        console.log(`Video ID: ${videoId}`);

        const transcript = await getSubtitles({ videoID: videoId, lang: 'en' });

        console.log(`Fetched transcript segments: ${transcript.length}`);
        const transcriptText = transcript.map(t => t.text).join('\n');

        // 3. Write to file
        const fileName = `${title}.txt`;
        const outputPath = path.join(process.cwd(), 'transcripts', fileName);

        console.log(`Saving transcript to: ${outputPath}`);
        await fs.ensureDir(path.join(process.cwd(), 'transcripts'));
        await fs.writeFile(outputPath, transcriptText, 'utf8');

        return res.status(200).json({
            message: 'Transcript saved successfully',
            title: title,
            fileName: fileName,
            transcript: transcriptText,
            segments: transcript // Return the array of { text, start, dur }
        });
    } catch (error) {
        console.error('Error fetching transcript:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({
            message: 'Error fetching transcript',
            error: errorMessage
        });
    }
}
