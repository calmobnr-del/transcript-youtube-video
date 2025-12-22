import { NextApiRequest, NextApiResponse } from 'next';
import { getSubtitles } from 'youtube-caption-extractor';
import ytdl from 'ytdl-core';
import fs from 'fs-extra';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // GET: Fetch transcript without saving
    if (req.method === 'GET') {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'URL is required' });
        }

        try {
            // 1. Get video info (title)
            const info = await ytdl.getBasicInfo(url);
            const title = info.videoDetails.title.replace(/[^\w\s]/gi, '_');
            const videoId = info.videoDetails.videoId;

            // 2. Fetch transcript
            console.log(`Fetching transcript for URL: ${url}`);
            const transcript = await getSubtitles({ videoID: videoId, lang: 'en' });
            console.log(`Fetched transcript segments: ${transcript.length}`);

            const transcriptText = transcript.map(t => t.text).join('\n');

            return res.status(200).json({
                message: 'Transcript fetched successfully',
                title: title,
                transcript: transcriptText,
                segments: transcript
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

    // POST: Save transcript to file
    if (req.method === 'POST') {
        const { url, title, transcript } = req.body;

        if (!url || !title || !transcript) {
            return res.status(400).json({ message: 'URL, title, and transcript are required' });
        }

        try {
            const fileName = `${title}.txt`;
            const outputPath = path.join(process.cwd(), 'transcripts', fileName);

            console.log(`Saving transcript to: ${outputPath}`);
            await fs.ensureDir(path.join(process.cwd(), 'transcripts'));
            await fs.writeFile(outputPath, transcript, 'utf8');

            return res.status(200).json({
                message: 'Transcript saved successfully',
                fileName: fileName
            });
        } catch (error) {
            console.error('Error saving transcript:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return res.status(500).json({
                message: 'Error saving transcript',
                error: errorMessage
            });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}
