import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { TranscriptService, TranscriptResponse, SaveTranscriptResponse } from './transcript.service';

@Controller('transcript')
export class TranscriptController {
  constructor(private readonly transcriptService: TranscriptService) {}

  @Get()
  async getTranscript(@Query('url') url: string): Promise<TranscriptResponse> {
    return this.transcriptService.fetchTranscript(url);
  }

  @Post()
  async saveTranscript(@Body() body: { url: string; title: string; transcript: string }): Promise<SaveTranscriptResponse> {
    return this.transcriptService.saveTranscript(body.url, body.title, body.transcript);
  }
}
