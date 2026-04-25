// DEPRECATED - replaced by FloorPlan AI upload flow; GitHub repos not needed
import { Octokit } from "@octokit/rest";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { jsonWithCors, optionsResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import type { RepoListItem } from "@/lib/types";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
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
      return jsonWithCors(
        { error: "GitHub access token is missing for this user." },
        { status: 403 },
      );
    }

    const octokit = new Octokit({
      auth: account.access_token,
    });

    const repos = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      {
        affiliation: "owner,collaborator,organization_member",
        per_page: 100,
        sort: "updated",
      },
    );

    const payload: RepoListItem[] = repos.map((repo) => ({
      id: repo.id,
      fullName: repo.full_name,
      name: repo.name,
      description: repo.description,
      language: repo.language,
      stargazerCount: repo.stargazers_count,
      updatedAt:
        repo.updated_at ??
        repo.pushed_at ??
        repo.created_at ??
        new Date(0).toISOString(),
      isPrivate: repo.private,
    }));

    return jsonWithCors(payload);
  } catch (error) {
    console.error("[repos] Failed to fetch repositories.", {
      userId: session.user.id,
      error,
    });

    return jsonWithCors(
      { error: "Failed to fetch repositories from GitHub." },
      { status: 502 },
    );
  }
}

export async function OPTIONS() {
  return optionsResponse();
}
