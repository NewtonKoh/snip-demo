import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { LinksService, LinkData, LinkResponse } from './links.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Snip';
  
  urlInput = signal('');
  links = signal<LinkData[]>([]);
  resultMessage = signal('');
  errorMessage = signal('');
  isLoading = signal(false);

  constructor(private linksService: LinksService) { }

  ngOnInit(): void {
    this.loadLinks();
  }

  loadLinks(): void {
    this.linksService.getLinks().subscribe({
      next: (data) => {
        this.links.set(data);
      },
      error: (err) => {
        console.error('Error loading links:', err);
        this.errorMessage.set('Failed to load links');
      }
    });
  }

  createLink(): void {
    const url = this.urlInput().trim();
    
    if (!url) {
      this.errorMessage.set('Please enter a URL');
      this.resultMessage.set('');
      return;
    }

    if (!this.isValidUrl(url)) {
      this.errorMessage.set('Please enter a valid HTTP(S) URL');
      this.resultMessage.set('');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.resultMessage.set('');

    this.linksService.createLink(url).subscribe({
      next: (response: LinkResponse) => {
        if (response.error) {
          this.errorMessage.set(response.error);
        } else if (response.shortUrl) {
          this.resultMessage.set(`Short URL: ${response.shortUrl}`);
          this.urlInput.set('');
          this.loadLinks();
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error creating link:', err);
        this.errorMessage.set('Failed to create short link');
        this.isLoading.set(false);
      }
    });
  }

  private isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.resultMessage.set('Copied to clipboard!');
      setTimeout(() => this.resultMessage.set(''), 2000);
    });
  }
}
