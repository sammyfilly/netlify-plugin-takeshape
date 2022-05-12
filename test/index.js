import test from "ava";
import sinon from "sinon";
import {
  createApiKey,
  ensureApiKeys,
  ensureProject,
} from "../src/lib/index.js";

test.afterEach(() => {
  sinon.restore();
});

test("createApiKey", async (t) => {
  const client = {
    request: sinon.fake.resolves({ tsCreateApiKey: { apiKey: "apiKey" } }),
  };

  const apiKey = await createApiKey(client, "name", "role");

  t.is(apiKey, "apiKey");
});

test("ensureApiKeys", async (t) => {
  const client = {
    request: sinon.stub(),
  };

  client.request.onFirstCall().resolves({ apiKeys: [] });
  client.request
    .onSecondCall()
    .resolves({ tsCreateApiKey: { apiKey: "readKey" } });
  client.request
    .onThirdCall()
    .resolves({ tsCreateApiKey: { apiKey: "readWriteKey" } });

  const { readKey, readWriteKey } = await ensureApiKeys(client);

  t.is(readKey, "readKey");
  t.is(readWriteKey, "readWriteKey");
});

test("ensureProject creates a project when the project does not exist", async (t) => {
  const client = {
    request: sinon.stub(),
  };

  client.request.onFirstCall().resolves({ projects: [] });
  client.request.onSecondCall().resolves({ project: { id: "projectId" } });

  const projectId = await ensureProject(client);

  t.is(projectId, "projectId");
});

test("ensureProject skips creation and returns the ID when the project exists", async (t) => {
  const client = {
    request: sinon.stub(),
  };

  client.request.onFirstCall().resolves({
    projects: [{ name: "[Netlify] site-name/branch", id: "existingProjectId" }],
  });
  client.request.onSecondCall().resolves({ project: { id: "newProjectId" } });

  const projectId = await ensureProject(client);

  t.is(projectId, "existingProjectId");
});
