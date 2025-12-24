import { Controller, Get } from '@nestjs/common';
import { JokeService } from './joke.service';

@Controller('joke')
export class JokeController {
  constructor(private readonly jokeService: JokeService) {}

  @Get()
  getJoke() {
    return this.jokeService.getJoke();
  }
}
