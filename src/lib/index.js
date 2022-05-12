import { existsSync, readdirSync, readFileSync } from "fs";
import fetch from "cross-fetch";
import { gql } from "graphql-request";
import JSZip from "jszip";

const { BRANCH, SITE_NAME } = process.env;

export async function ensureLatestSchema(git, projectId) {
  if (!git.modifiedFiles.includes(".takeshape/pattern/schema.json")) {
    return;
  }

  await fetch([baseUrl, "project", projectId, "schema"].join("/"), {
    body: readFileSync(".takeshape/pattern/schema.json"),
    headers: {
      ...authorizationHeader,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function createApiKey(client, name, role) {
  const {
    tsCreateApiKey: { apiKey },
  } = await client.request(
    gql`
      mutation ($name: String!, $role: String!) {
        tsCreateApiKey(name: $name, role: $role) {
          apiKey
        }
      }
    `,
    { name, role }
  );

  return apiKey;
}

export async function ensureApiKeys(client) {
  const { apiKeys } = await client.request(gql`
    {
      apiKeys: tsGetApiKeysByProject {
        role
      }
    }
  `);

  const readKeyName = "Netlify Read Only";
  const readKeyRole = "read";
  const readKey = apiKeys.find(
    (k) => k.name === readKeyName && k.role === readKeyRole
  )
    ? undefined
    : await createApiKey(client, readKeyName, readKeyRole);

  const readWriteKeyName = "Netlify Read/Write";
  const readWriteKeyRole = "readWrite";
  const readWriteKey = apiKeys.find(
    (k) => k.name === readWriteKeyName && k.role === readWriteKeyRole
  )
    ? undefined
    : await createApiKey(client, readWriteKeyName, readWriteKeyRole);

  return { readKey, readWriteKey };
}

async function getUploadUri(client, projectId) {
  const { tsUploadProject } = await client.request(
    gql`
      mutation ($projectId: String!) {
        tsUploadProject(
          name: "pattern.zip"
          type: "application/zip"
          projectId: $projectId
        ) {
          uri
          importId
        }
      }
    `,
    {
      projectId,
    }
  );

  return tsUploadProject;
}

async function uploadPattern(client, projectId) {
  const { uri, importId } = await getUploadUri(client, projectId);

  const zip = new JSZip();
  for (const filename of readdirSync(".takeshape/pattern")) {
    zip.file(filename, readFileSync(`.takeshape/pattern/${filename}`));
  }
  const body = await zip.generateAsync({ type: "arraybuffer" });

  await fetch(uri, {
    body,
    headers: {
      "Content-Length": body.byteLength,
    },
    method: "PUT",
  });

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const { tsGetProjectImport } = await client.request(
      gql`
        query ($importId: String!) {
          tsGetProjectImport(id: $importId) {
            message
            status
          }
        }
      `,
      { importId }
    );

    if (tsGetProjectImport === null) {
      continue;
    }

    const { message, status } = tsGetProjectImport;
    if (status === "running") {
      continue;
    }

    if (status === "completed") {
      break;
    }

    if (status === "timeout") {
      throw new Error("Pattern import timed out");
    }

    if (status === "error") {
      throw new Error(message ?? "Pattern import failed");
    }

    throw new Error(`Unexpected pattern import status: ${status}`);
  }
}

export async function ensureProject(client, timezone) {
  const projectName = `[Netlify] ${SITE_NAME}${BRANCH ? `/${BRANCH}` : ""}`;

  const { projects } = await client.request(gql`
    query {
      projects: tsGetProjectList {
        id
        name
      }
    }
  `);

  const existingProject = projects.find((p) => p.name === projectName);
  if (existingProject) {
    console.log(`Project ${projectName} already exists`);
    return existingProject.id;
  }

  const { project } = await client.request(
    gql`
      mutation CreateProject($projectName: String!, $timezone: String!) {
        project: tsCreateProject(
          name: $projectName
          defaultTimezone: $timezone
        ) {
          id
        }
      }
    `,
    {
      projectName,
      timezone,
    }
  );

  if (existsSync(".takeshape/pattern")) {
    await uploadPattern(client, project.id);
  }

  return project.id;
}
