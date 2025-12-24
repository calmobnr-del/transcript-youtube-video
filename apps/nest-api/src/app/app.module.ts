import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TranscriptModule } from './transcript/transcript.module';
import { JokeModule } from './joke/joke.module';

@Module({
  imports: [TranscriptModule, JokeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
