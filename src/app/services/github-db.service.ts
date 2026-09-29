import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Db, emptyDb } from '../models/db.model';
import { SettingsService } from './settings.service';

interface ContentsGetResponse {
  content: string;
  encoding: string;
  sha: string;
}

interface ContentsPutResponse {
  content: { sha: string };
}

export class GitHubDbError extends Error {}

@Injectable({ providedIn: 'root' })
export class GitHubDbService {
  private lastSha: string | null = null;

  constructor(private http: HttpClient, private settings: SettingsService) {}

  /** Loads db.json from the configured repo. Returns an empty db if the file doesn't exist yet. */
  async load(): Promise<Db> {
    const s = this.settings.settings();
    if (!s) {
      throw new GitHubDbError('GitHub is not configured yet.');
    }
    try {
      const res = await firstValueFrom(
        this.http.get<ContentsGetResponse>(this.contentsUrl(s), {
          headers: this.headers(s.token),
          params: { ref: s.branch },
        })
      );
      this.lastSha = res.sha;
      const json = decodeBase64Utf8(res.content);
      return JSON.parse(json) as Db;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this.lastSha = null;
        return emptyDb();
      }
      throw toFriendlyError(err);
    }
  }

  /** Writes db.json back to the repo, creating it if it doesn't exist yet. */
  async save(db: Db, message: string): Promise<void> {
    const s = this.settings.settings();
    if (!s) {
      throw new GitHubDbError('GitHub is not configured yet.');
    }
    const body = {
      message,
      content: encodeBase64Utf8(JSON.stringify(db, null, 2)),
      branch: s.branch,
      ...(this.lastSha ? { sha: this.lastSha } : {}),
    };
    try {
      const res = await firstValueFrom(
        this.http.put<ContentsPutResponse>(this.contentsUrl(s), body, { headers: this.headers(s.token) })
      );
      this.lastSha = res.content.sha;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        // Someone/something else changed the file since we last read it — refetch and retry once.
        await this.load();
        await this.save(db, message);
        return;
      }
      throw toFriendlyError(err);
    }
  }

  /**
   * Verifies the token can see the repo, without touching db.json. Checks the
   * repo itself rather than a specific branch — a brand-new repo created
   * without a README has no commits yet, so no branches exist either, and a
   * branch-existence check would 404 even with a perfectly valid token.
   */
  async testConnection(candidate: { token: string; owner: string; repo: string; branch: string }): Promise<void> {
    try {
      await firstValueFrom(
        this.http.get(`https://api.github.com/repos/${candidate.owner}/${candidate.repo}`, {
          headers: this.headers(candidate.token),
        })
      );
    } catch (err) {
      throw toFriendlyError(err);
    }
  }

  private contentsUrl(s: { owner: string; repo: string; path: string }): string {
    return `https://api.github.com/repos/${s.owner}/${s.repo}/contents/${s.path}`;
  }

  private headers(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    };
  }
}

function encodeBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function toFriendlyError(err: unknown): GitHubDbError {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 401) {
      return new GitHubDbError('GitHub rejected the token (401). Check it is valid and not expired.');
    }
    if (err.status === 403) {
      return new GitHubDbError('GitHub denied access (403). Check the token has repo contents read/write permission.');
    }
    if (err.status === 404) {
      return new GitHubDbError('Repository, branch, or path not found (404). Check owner/repo/branch.');
    }
    return new GitHubDbError(`GitHub API error (${err.status}): ${err.message}`);
  }
  return new GitHubDbError('Unexpected error talking to GitHub.');
}
