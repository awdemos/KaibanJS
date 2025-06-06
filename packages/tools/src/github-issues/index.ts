/**
 * GitHub Issues
 *
 * This tool integrates with GitHub's API to fetch issues from specified repositories.
 * It provides a clean, structured way to retrieve open issues, making it ideal for
 * monitoring and analysis purposes.
 *
 * Key features:
 * - Fetches open issues from any public GitHub repository
 * - Handles pagination automatically
 * - Returns structured data with issue details
 * - Includes metadata like issue numbers, titles, labels, and descriptions
 *
 * Authentication:
 * - Works without authentication for public repositories (60 requests/hour limit)
 * - Optional GitHub token for higher rate limits (5,000 requests/hour)
 *
 * Rate Limits:
 * - Authenticated: 5,000 requests per hour
 * - Unauthenticated: 60 requests per hour
 *
 * For more information about GitHub's API, visit: https://docs.github.com/en/rest
 */

import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import ky, { HTTPError } from 'ky';

/**
 * Configuration options for the GithubIssues tool
 * @interface GithubIssuesFields
 * @property {string} [token] - GitHub personal access token for authentication
 * @property {number} [limit] - Maximum number of issues to fetch (defaults to 10)
 */
interface GithubIssuesFields {
  token?: string;
  limit?: number;
}

/**
 * Repository information parsed from a GitHub URL
 * @interface GithubIssuesRepoInfo
 * @property {string} owner - Repository owner/organization name
 * @property {string} repo - Repository name
 * @example
 * {
 *   owner: "langchain-ai",
 *   repo: "langchainjs"
 * }
 */
interface GithubIssuesRepoInfo {
  owner: string;
  repo: string;
}

/**
 * Raw GitHub issue data structure returned from the API
 * @interface GitHubIssue
 * @property {number} number - Issue number
 * @property {string} title - Issue title
 * @property {string} html_url - URL to the issue on GitHub
 * @property {Array<{name: string}>} labels - Array of label objects
 * @property {string} [body] - Issue description/body
 */
interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  labels: Array<{ name: string }>;
  body?: string;
}

/**
 * Structured response format for GitHub issues
 * @interface FormattedResponse
 * @example
 * {
 *   repository: {
 *     name: "langchainjs",
 *     url: "https://github.com/langchain-ai/langchainjs",
 *     owner: "langchain-ai"
 *   },
 *   metadata: {
 *     totalIssues: 5,
 *     lastUpdated: "2024-03-20",
 *     limit: 10
 *   },
 *   issues: [{
 *     number: 123,
 *     title: "Add new feature",
 *     url: "https://github.com/langchain-ai/langchainjs/issues/123",
 *     labels: ["enhancement"],
 *     description: "We should add this new feature..."
 *   }]
 * }
 */
interface FormattedResponse {
  repository: {
    name: string;
    url: string;
    owner: string;
  };
  metadata: {
    totalIssues: number;
    lastUpdated: string;
    limit: number;
  };
  issues: Array<{
    number: number;
    title: string;
    url: string;
    labels: string[];
    description: string;
  }>;
}

/**
 * Error message returned when the GitHub API request fails
 * @typedef {string} GithubIssuesError
 * @example "API request failed: Client Error (404)"
 */
type GithubIssuesError = string;

/**
 * Response type that can either be a formatted response or an error message
 * @typedef {FormattedResponse | GithubIssuesError} GithubIssuesResponse
 */
type GithubIssuesResponse = FormattedResponse | GithubIssuesError;

export class GithubIssues extends StructuredTool {
  private token?: string;
  private limit: number;
  private httpClient: typeof ky;
  name = 'github-issues';
  description =
    'Fetches open issues from a specified GitHub repository. Input should include the repository URL.';
  schema = z.object({
    repoUrl: z
      .string()
      .url()
      .describe(
        'The GitHub repository URL (e.g., https://github.com/owner/repo)'
      ),
  });

  constructor(fields: GithubIssuesFields = {}) {
    super();
    this.token = fields.token;
    this.limit = fields.limit || 10;
    this.httpClient = ky;
  }

  async _call(input: { repoUrl: string }): Promise<GithubIssuesResponse> {
    try {
      const { owner, repo } = this._parseRepoUrl(input.repoUrl);
      const issues = await this._fetchIssues({ owner, repo });
      return this._formatResponse(issues, { owner, repo });
    } catch (error) {
      if (error instanceof HTTPError) {
        const statusCode = error.response.status;
        let errorType = 'Unknown';
        if (statusCode >= 400 && statusCode < 500) {
          errorType = 'Client Error';
        } else if (statusCode >= 500) {
          errorType = 'Server Error';
        }
        return `API request failed: ${errorType} (${statusCode})`;
      } else {
        return `An unexpected error occurred: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    }
  }

  private async _fetchIssues({
    owner,
    repo,
  }: GithubIssuesRepoInfo): Promise<GitHubIssue[]> {
    let page = 1;
    let allIssues: GitHubIssue[] = [];
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let hasMorePages = true;
    while (hasMorePages) {
      const issues = await this.httpClient
        .get(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          searchParams: {
            page: String(page),
            per_page: '100',
            state: 'open',
          },
          headers,
          timeout: 10000,
        })
        .json<GitHubIssue[]>();

      if (!Array.isArray(issues) || issues.length === 0) {
        hasMorePages = false;
        break;
      }

      allIssues = allIssues.concat(issues);
      if (allIssues.length >= this.limit) {
        allIssues = allIssues.slice(0, this.limit);
        hasMorePages = false;
        break;
      }
      page++;
    }

    return allIssues;
  }

  private _formatResponse(
    issues: GitHubIssue[],
    input: GithubIssuesRepoInfo
  ): FormattedResponse {
    const { owner, repo } = input;
    const repoUrl = `https://github.com/${owner}/${repo}`;
    const today = new Date().toISOString().split('T')[0];

    return {
      repository: {
        name: repo,
        url: repoUrl,
        owner: owner,
      },
      metadata: {
        totalIssues: issues.length,
        lastUpdated: today,
        limit: this.limit,
      },
      issues: issues.map((issue) => ({
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        labels: issue.labels.map((label) => label.name),
        description: issue.body || 'No description provided',
      })),
    };
  }

  private _parseRepoUrl(url: string): GithubIssuesRepoInfo {
    try {
      const path = new URL(url).pathname.split('/').filter(Boolean);
      if (path.length < 2) {
        throw new Error('Invalid GitHub repository URL');
      }
      return { owner: path[0], repo: path[1] };
    } catch (_error) {
      throw new Error('Invalid GitHub repository URL');
    }
  }
}
