import { GraphQLClient } from "graphql-request";
import {
  ensureProject,
  ensureLatestSchema,
  ensureApiKeys,
} from "./lib/index.js";

const { TAKESHAPE_BASE_URL, TAKESHAPE_ACCESS_TOKEN } = process.env;

const authorizationHeader = {
  Authorization: `Bearer ${TAKESHAPE_ACCESS_TOKEN}`,
};
const baseUrl = TAKESHAPE_BASE_URL ?? "https://api.takeshape.io";

export const onPreBuild = async function ({
  inputs: { timezone },
  netlifyConfig,
  utils,
}) {
  if (TAKESHAPE_ACCESS_TOKEN === undefined) {
    utils.build.failBuild(
      "Create a personal access token and add it to your build environment variables as TAKESHAPE_ACCESS_TOKEN."
    );
  }

  try {
    const client = new GraphQLClient([baseUrl, "v3/admin-graphql"].join("/"), {
      headers: authorizationHeader,
    });

    const projectId = await ensureProject(client, timezone);
    await ensureLatestSchema(utils.git, projectId);

    const projectClient = new GraphQLClient(
      [baseUrl, "project", projectId, "v3/admin-graphql"].join("/"),
      {
        headers: authorizationHeader,
      }
    );

    const { readKey, readWriteKey } = await ensureApiKeys(projectClient);

    netlifyConfig.build.environment.TAKESHAPE_API_URL = `https://api.takeshape.io/project/${projectId}/v3/graphql`;
    netlifyConfig.build.environment.TAKESHAPE_READ_ONLY_API_KEY = readKey;
    netlifyConfig.build.environment.TAKESHAPE_READ_WRITE_KEY = readWriteKey;
  } catch (e) {
    utils.build.failBuild(
      e.response?.errors?.[0]?.validationErrors?.[0]?.instancePath ===
        "/defaultTimezone"
        ? `Invalid timezone "${timezone}"`
        : e.response?.status === 401
        ? "Invalid TAKESHAPE_ACCESS_TOKEN"
        : e.message
    );
  }
};
