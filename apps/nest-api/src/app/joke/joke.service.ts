import { Injectable } from '@nestjs/common';
import * as jokes from '../../assets/jokes.json';

@Injectable()
export class JokeService {
  getJoke() {
    const jokeCount = jokes.jokes.length;
    const randomIndex = Math.floor(Math.random() * jokeCount);
    return { joke: jokes.jokes[randomIndex] };
  }
}
