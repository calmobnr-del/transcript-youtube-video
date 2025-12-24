import { Component, inject, signal, computed, effect } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface TranscriptSegment {
  text: string;
  start: string;
  dur: string;
}

@Component({
  standalone: true,
  imports: [NgClass, FormsModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private http = inject(HttpClient);
  private player: any;
  private timeUpdateInterval: any;

  youtubeUrl = signal('');
  status = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  message = signal('');
  title = signal('');
  fileName = signal('');
  segments = signal<TranscriptSegment[]>([]);
  currentTime = signal(0);
  saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  saveMessage = signal('');

  activeSegmentIndex = computed(() => {
    const time = this.currentTime();
    return this.segments().findIndex((s, i) => {
      const start = parseFloat(s.start);
      const nextStart = this.segments()[i + 1] ? parseFloat(this.segments()[i + 1].start) : Infinity;
      return time >= start && time < nextStart;
    });
  });

  videoId = computed(() => this.extractVideoId(this.youtubeUrl()));

  fetchVideo() {
     const id = this.videoId();
      if (id) {
        if (this.status() === 'idle') {
          this.fetchTranscript();
        }
        this.initPlayer(id);
      }
  }

  removeVideo() {
    this.player?.destroy();
    this.player = null;
    this.status.set('idle');
    this.message.set('');
    this.title.set('');
    this.fileName.set('');
    this.segments.set([]);
    this.currentTime.set(0);
    this.saveStatus.set('idle');
    this.saveMessage.set('');
    this.youtubeUrl.set('');
    console.log('removeVideo');

  }

  constructor() {
    this.loadYouTubeApi();

    // Auto-fetch transcript when videoId changes and is valid
    // effect(() => {
    //   const id = this.videoId();
    //   if (id) {
    //     if (this.status() === 'idle') {
    //       this.fetchTranscript();
    //     }
    //     this.initPlayer(id);
    //   }
    // });

    // Auto-scroll to active segment
    effect(() => {
      const index = this.activeSegmentIndex();
      if (index !== -1) {
        const element = document.getElementById(`segment-${index}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }

  private loadYouTubeApi() {
    if ((window as any).YT) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  }

  private initPlayer(videoId: string) {
    if (!(window as any).YT || !(window as any).YT.Player) {
      setTimeout(() => this.initPlayer(videoId), 100);
      return;
    }

    if (this.player) {
      this.player.loadVideoById(videoId);
      return;
    }

    this.player = new (window as any).YT.Player('youtube-player', {
      videoId: videoId,
      events: {
        onStateChange: (event: any) => {
          if (event.data === (window as any).YT.PlayerState.PLAYING) {
            this.startTimeUpdates();
          } else {
            this.stopTimeUpdates();
          }
        },
      },
    });
  }

  private startTimeUpdates() {
    this.stopTimeUpdates();
    this.timeUpdateInterval = setInterval(() => {
      if (this.player && this.player.getCurrentTime) {
        this.currentTime.set(this.player.getCurrentTime());
      }
    }, 200);
  }

  private stopTimeUpdates() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
  }

  private extractVideoId(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  fetchTranscript() {
    const url = this.youtubeUrl();
    if (!url) {
      this.status.set('error');
      this.message.set('Please enter a valid YouTube URL');
      return;
    }

    this.status.set('loading');
    this.message.set('Fetching transcript...');
    this.segments.set([]);
    this.saveStatus.set('idle');

    this.http.get<{ message: string; title: string; transcript: string; segments: TranscriptSegment[] }>(`/api/transcript?url=${encodeURIComponent(url)}`)
      .pipe(
        catchError((err: { error?: { message?: string } }) => {
          this.status.set('error');
          this.message.set(err.error?.message || 'Failed to fetch transcript');
          return of(null);
        })
      )
      .subscribe((res) => {
        if (res) {
          this.status.set('success');
          this.message.set(res.message);
          this.title.set(res.title);
          this.segments.set(res.segments);
        }
      });
  }

  saveTranscript() {
    const url = this.youtubeUrl();
    const title = this.title();
    const transcript = this.segments().map(s => s.text).join('\n');

    if (!url || !title || !transcript) {
      this.saveStatus.set('error');
      this.saveMessage.set('No transcript to save');
      return;
    }

    this.saveStatus.set('saving');
    this.saveMessage.set('Saving transcript...');

    this.http.post<{ message: string; fileName: string }>('/api/transcript', { url, title, transcript })
      .pipe(
        catchError((err: { error?: { message?: string } }) => {
          this.saveStatus.set('error');
          this.saveMessage.set(err.error?.message || 'Failed to save transcript');
          return of(null);
        })
      )
      .subscribe((res) => {
        if (res) {
          this.saveStatus.set('saved');
          this.saveMessage.set(res.message);
          this.fileName.set(res.fileName);
          setTimeout(() => {
            this.saveStatus.set('idle');
            this.saveMessage.set('');
          }, 3000);
        }
      });
  }

  seekTo(seconds: string) {
    if (this.player && this.player.seekTo) {
      this.player.seekTo(parseFloat(seconds));
      this.player.playVideo();
    }
  }

  copyToClipboard() {
    const text = this.segments().map(s => s.text).join('\n');
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Transcript copied to clipboard!');
      });
    }
  }
}
