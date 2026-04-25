import { Octokit } from "@octokit/rest";

import { prisma } from "@/lib/prisma";
import type { RepoListItem } from "@/lib/types";

export class MissingGitHubAccessTokenError extends Error {
  constructor() {
    super("GitHub access token is missing for this user.");
    this.name = "MissingGitHubAccessTokenError";
  }
}

async function getGitHubAccessTokenForUser(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "github",
    },
    select: {
      access_token: true,
    },
    orderBy: {
      id: "desc",
    },
  });

  if (!account?.access_token) {
    throw new MissingGitHubAccessTokenError();
  }

  return account.access_token;
}

export async function listReposForUser(userId: string): Promise<RepoListItem[]> {
  const accessToken = await getGitHubAccessTokenForUser(userId);
  const octokit = new Octokit({
    auth: accessToken,
  });

  const repos = await octokit.paginate(
    octokit.rest.repos.listForAuthenticatedUser,
    {
      affiliation: "owner,collaborator,organization_member",
      per_page: 100,
      sort: "updated",
    },
  );

  return repos.map((repo) => ({
    id: repo.id,
    fullName: repo.full_name,
    name: repo.name,
    description: repo.description,
    language: repo.language,
    stargazerCount: repo.stargazers_count,
    updatedAt:
      repo.updated_at ?? repo.pushed_at ?? repo.created_at ?? new Date(0).toISOString(),
    isPrivate: repo.private,
  }));
}
