import { Injectable, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { getSubtitles } from 'youtube-caption-extractor';
import * as ytdl from 'ytdl-core';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface TranscriptResponse {
  message: string;
  title: string;
  transcript: string;
  segments: any[];
}

export interface SaveTranscriptResponse {
  message: string;
  fileName: string;
}

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);

  async fetchTranscript(url: string): Promise<TranscriptResponse> {
    if (!url) {
      throw new BadRequestException('URL is required');
    }

    try {
      this.logger.log(`Fetching transcript for URL: ${url}`);
      // 1. Get video info (title)
      const info = await ytdl.getBasicInfo(url);
      const title = info.videoDetails.title.replace(/[^\w\s]/gi, '_');
      const videoId = info.videoDetails.videoId;

      // 2. Fetch transcript
      const transcript = await getSubtitles({ videoID: videoId, lang: 'en' });
      this.logger.log(`Fetched transcript segments: ${transcript.length}`);

      const transcriptText = transcript.map(t => t.text).join('\n');

      return {
        message: 'Transcript fetched successfully',
        title: title,
        transcript: transcriptText,
        segments: transcript,
      };
    } catch (error) {
      this.logger.error('Error fetching transcript:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException({
        message: 'Error fetching transcript',
        error: errorMessage,
      });
    }
  }

  async saveTranscript(url: string, title: string, transcript: string): Promise<SaveTranscriptResponse> {
    if (!url || !title || !transcript) {
        throw new BadRequestException('URL, title, and transcript are required');
    }

    try {
      const fileName = `${title}.txt`;
      // Save to project root 'transcripts' folder for consistency with Next.js app
      // Assuming process.cwd() is the workspace root when running via nx serve
      const outputPath = path.join(process.cwd(), 'transcripts', fileName);

      this.logger.log(`Saving transcript to: ${outputPath}`);
      await fs.ensureDir(path.join(process.cwd(), 'transcripts'));
      await fs.writeFile(outputPath, transcript, 'utf8');

      return {
        message: 'Transcript saved successfully',
        fileName: fileName,
      };
    } catch (error) {
      this.logger.error('Error saving transcript:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new InternalServerErrorException({
            message: 'Error saving transcript',
            error: errorMessage,
        });
    }
  }
}
