import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LinkData {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

export interface LinkResponse {
  code?: string;
  url?: string;
  shortUrl?: string;
  hits?: number;
  createdAt?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LinksService {
  private apiUrl = 'http://localhost:3000/api/links';

  constructor(private http: HttpClient) { }

  createLink(url: string): Observable<LinkResponse> {
    return this.http.post<LinkResponse>(this.apiUrl, { url });
  }

  getLinks(): Observable<LinkData[]> {
    return this.http.get<LinkData[]>(this.apiUrl);
  }
}
