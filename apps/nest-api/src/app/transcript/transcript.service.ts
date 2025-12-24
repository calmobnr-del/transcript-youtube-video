import {
  Injectable,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { getSubtitles } from 'youtube-caption-extractor'; // Method A (Your favorite)
import { YoutubeTranscript } from 'youtube-transcript'; // Method B (Fallback)
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

    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new BadRequestException('Invalid YouTube URL');
    }

    this.logger.log(`Fetching transcript for URL: ${url} (ID: ${videoId})`);

    // We cannot reliably get the Title without ytdl (which crashes), so we use ID.
    const safeTitle = `Video_${videoId}`;
    let finalSegments: any[] = [];

    // --- STRATEGY 1: youtube-caption-extractor (Works best Locally) ---
    try {
      this.logger.log('Attempting Strategy 1: youtube-caption-extractor');
      const segments = await getSubtitles({ videoID: videoId, lang: 'en' });

      if (segments && segments.length > 0) {
        this.logger.log(
          `Strategy 1 success! Found ${segments.length} segments.`,
        );
        finalSegments = segments;
      } else {
        this.logger.warn(
          'Strategy 1 returned empty segments. Switching to fallback...',
        );
      }
    } catch (error) {
      this.logger.warn(
        `Strategy 1 failed: ${error.message}. Switching to fallback...`,
      );
    }

    // --- STRATEGY 2: youtube-transcript (Backup for Vercel/Blocking) ---
    if (finalSegments.length === 0) {
      try {
        this.logger.log('Attempting Strategy 2: youtube-transcript');
        const segments = await YoutubeTranscript.fetchTranscript(videoId);

        if (segments && segments.length > 0) {
          this.logger.log(
            `Strategy 2 success! Found ${segments.length} segments.`,
          );
          // Map to your preferred format if necessary
          finalSegments = segments.map((s) => ({
            start: (s.offset / 1000).toString(),
            dur: (s.duration / 1000).toString(),
            text: s.text,
          }));
        }
      } catch (error) {
        this.logger.error(`Strategy 2 failed: ${error.message}`);
      }
    }

    // --- FINAL RESULT CHECK ---
    if (finalSegments.length === 0) {
      // If both failed, it's likely a hard IP block or no captions exist.
      return {
        message:
          'No transcript available (IP might be blocked or no captions found)',
        title: safeTitle,
        transcript: '',
        segments: [],
      };
    }

    const transcriptText = finalSegments.map((t) => t.text).join(' ');

    return {
      message: 'Transcript fetched successfully',
      title: safeTitle,
      transcript: transcriptText,
      segments: finalSegments,
    };
  }

  async saveTranscript(
    url: string,
    title: string,
    transcript: string,
  ): Promise<SaveTranscriptResponse> {
    if (!title || !transcript) {
      throw new BadRequestException('Title and transcript are required');
    }

    try {
      const safeFileName =
        title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.txt';
      const outputPath = path.join(process.cwd(), 'transcripts', safeFileName);

      this.logger.log(`Saving transcript to: ${outputPath}`);
      await fs.ensureDir(path.join(process.cwd(), 'transcripts'));
      await fs.writeFile(outputPath, transcript, 'utf8');

      return {
        message: 'Transcript saved successfully',
        fileName: safeFileName,
      };
    } catch (error) {
      this.logger.error('Error saving transcript:', error);
      throw new InternalServerErrorException({
        message: 'Error saving transcript',
      });
    }
  }

  private extractVideoId(url: string): string | null {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }
}
