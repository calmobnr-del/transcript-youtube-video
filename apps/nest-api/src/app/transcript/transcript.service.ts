import {
  Injectable,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { getSubtitles } from 'youtube-caption-extractor'; // <--- BACK TO YOUR ORIGINAL LIB
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

      // 1. Extract Video ID manually (Avoids ytdl-core 410 crash)
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new BadRequestException('Invalid YouTube URL');
      }

      // 2. Fetch transcript using your original library
      // We explicitly ask for English ('en') to match your original success
      const transcript = await getSubtitles({ videoID: videoId, lang: 'en' });

      this.logger.log(`Fetched transcript segments: ${transcript.length}`);

      if (!transcript || transcript.length === 0) {
        this.logger.warn(
          'Transcript array is empty. Video might not have English captions.',
        );
      }

      // 3. Process text
      const transcriptText = transcript.map((t) => t.text).join('\n');

      // 4. Safe Title (We cannot fetch the real title without ytdl, so we use the ID)
      const safeTitle = `Video_${videoId}`;

      return {
        message: 'Transcript fetched successfully',
        title: safeTitle,
        transcript: transcriptText,
        segments: transcript, // This returns the array structure you wanted
      };
    } catch (error) {
      this.logger.error('Error fetching transcript:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('429') || errorMessage.includes('410')) {
        throw new InternalServerErrorException(
          'YouTube has blocked the request from this IP.',
        );
      }

      throw new InternalServerErrorException({
        message: 'Error fetching transcript',
        error: errorMessage,
      });
    }
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException({
        message: 'Error saving transcript',
        error: errorMessage,
      });
    }
  }

  // Helper to get ID without ytdl
  private extractVideoId(url: string): string | null {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }
}
