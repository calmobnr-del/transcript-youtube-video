import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TranscriptModule } from './transcript/transcript.module';

@Module({
  imports: [TranscriptModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
