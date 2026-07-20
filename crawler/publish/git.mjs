import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readFile,
  rmdir,
  stat,
  unlink,
} from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { hostname, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

export const EXPECTED_GITHUB_OWNER = "ipadmom";
export const EXPECTED_GITHUB_REPOSITORY = "chevrolet-color-archive";
export const EXPECTED_GITHUB_REMOTE =
  "https://github.com/ipadmom/chevrolet-color-archive.git";
export const EXPECTED_GITHUB_BRANCH = "main";

const NULL_DEVICE = process.platform === "win32" ? "NUL" : "/dev/null";
const CREDENTIAL_HELPER_PATH = fileURLToPath(
  new URL("./credential-helper.mjs", import.meta.url),
);
const activePublisherLocks = new Set();
const executableCache = new Map();
const LOCK_OWNER_FILE = "owner.json";
const UNOWNED_LOCK_STALE_MILLISECONDS = 60 * 60 * 1000;

function resolveExecutable(command) {
  if (executableCache.has(command)) return executableCache.get(command);
  const suffixes = process.platform === "win32" ? [".exe"] : [""];
  for (const directory of String(process.env.PATH ?? "").split(path.delimiter)) {
    const cleanDirectory = directory.replace(/^"|"$/g, "");
    if (!cleanDirectory) continue;
    for (const suffix of suffixes) {
      const candidate = path.resolve(cleanDirectory, `${command}${suffix}`);
      if (existsSync(candidate)) {
        const resolved = realpathSync(candidate);
        executableCache.set(command, resolved);
        return resolved;
      }
    }
  }
  throw new Error(`${command} executable was not found on the startup PATH.`);
}

function publisherRootKey(root) {
  const resolved = path.resolve(root);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function publisherLockPath(root) {
  const rootKey = publisherRootKey(root);
  const lockId = createHash("sha256").update(rootKey).digest("hex");
  const temporaryRoot = path.resolve(tmpdir());
  const lockPath = path.resolve(
    temporaryRoot,
    `chevrolet-photo-publisher-${lockId}.lock`,
  );
  if (path.dirname(lockPath) !== temporaryRoot) {
    throw new Error("Publisher lock path escaped the temporary directory.");
  }
  return lockPath;
}

function processIsRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function removeLockDirectory(lockPath) {
  const metadata = await lstat(lockPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (!metadata) return;
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("Publisher lock path is not a safe directory.");
  }
  await unlink(path.join(lockPath, LOCK_OWNER_FILE)).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
  await rmdir(lockPath).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
}

async function recoverStalePublisherLock(lockPath, rootKey) {
  const lockMetadata = await stat(lockPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (!lockMetadata) return true;

  let owner = null;
  try {
    owner = JSON.parse(
      await readFile(path.join(lockPath, LOCK_OWNER_FILE), "utf8"),
    );
  } catch {
    // A process can die between mkdir and owner-file creation. A fresh
    // unowned lock remains protected until the conservative stale interval.
  }
  const validOwner =
    owner &&
    Number.isSafeInteger(owner.pid) &&
    owner.pid > 0 &&
    typeof owner.hostname === "string" &&
    typeof owner.repoRootKey === "string";
  if (validOwner && owner.repoRootKey !== rootKey) {
    throw new Error("Publisher lock metadata belongs to another repository.");
  }

  let stale = false;
  if (validOwner && owner.hostname === hostname()) {
    stale = !processIsRunning(owner.pid);
  } else {
    stale =
      Date.now() - lockMetadata.mtimeMs >
      UNOWNED_LOCK_STALE_MILLISECONDS;
  }
  if (!stale) return false;
  await removeLockDirectory(lockPath);
  return true;
}

async function acquirePublisherLock(root, rootKey) {
  const lockPath = publisherLockPath(root);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await mkdir(lockPath);
      const handle = await open(path.join(lockPath, LOCK_OWNER_FILE), "wx");
      try {
        await handle.writeFile(
          JSON.stringify({
            pid: process.pid,
            hostname: hostname(),
            repoRootKey: rootKey,
            startedAt: new Date().toISOString(),
          }),
          "utf8",
        );
      } finally {
        await handle.close();
      }
      return lockPath;
    } catch (error) {
      if (error?.code !== "EEXIST") {
        await removeLockDirectory(lockPath).catch(() => undefined);
        throw error;
      }
      if (activePublisherLocks.has(rootKey)) {
        throw new Error(
          "Another Chevrolet photo publisher already holds the repository lock.",
        );
      }
      const recovered = await recoverStalePublisherLock(lockPath, rootKey);
      if (!recovered || attempt === 1) {
        throw new Error(
          "Another Chevrolet photo publisher already holds the repository lock.",
        );
      }
    }
  }
  throw new Error("Could not acquire the Chevrolet photo publisher lock.");
}

export function sanitizeGitEnvironment(baseEnvironment = process.env) {
  const clean = { ...baseEnvironment };
  for (const key of Object.keys(clean)) {
    const normalizedKey = key.toUpperCase();
    if (
      /^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+)$/.test(normalizedKey) ||
      [
        "GH_TOKEN",
        "GITHUB_TOKEN",
        "GH_CONFIG_DIR",
        "PUBLISH_QUEUE_TOKEN",
        "GH_DEBUG",
        "GH_ENTERPRISE_TOKEN",
        "GH_HOST",
        "GH_REPO",
        "ALL_PROXY",
        "BASH_ENV",
        "CDPATH",
        "CURL_CA_BUNDLE",
        "ENV",
        "GIT_ASKPASS",
        "GIT_ALTERNATE_OBJECT_DIRECTORIES",
        "GIT_COMMON_DIR",
        "GIT_CONFIG_GLOBAL",
        "GIT_CONFIG_NOSYSTEM",
        "GIT_CONFIG_PARAMETERS",
        "GIT_CONFIG_SYSTEM",
        "GIT_CURL_VERBOSE",
        "GIT_DIR",
        "GIT_EXEC_PATH",
        "GIT_INDEX_FILE",
        "GIT_NAMESPACE",
        "GIT_OBJECT_DIRECTORY",
        "GIT_PROXY_COMMAND",
        "GIT_QUARANTINE_PATH",
        "GIT_REPLACE_REF_BASE",
        "GIT_SHALLOW_FILE",
        "GIT_SSL_CAINFO",
        "GIT_SSL_CAPATH",
        "GIT_SSL_NO_VERIFY",
        "SSH_ASKPASS",
        "GIT_SSH",
        "GIT_SSH_COMMAND",
        "GIT_TRACE",
        "GIT_TRACE_CURL",
        "GIT_TRACE_PACKET",
        "GIT_WORK_TREE",
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "NO_PROXY",
        "NODE_DEBUG",
        "NODE_EXTRA_CA_CERTS",
        "NODE_OPTIONS",
        "NODE_PATH",
        "NODE_TLS_REJECT_UNAUTHORIZED",
        "NODE_V8_COVERAGE",
        "SHELLOPTS",
        "SSL_CERT_DIR",
        "SSL_CERT_FILE",
      ].includes(normalizedKey)
      || /^GIT_TRACE2/.test(normalizedKey)
    ) {
      delete clean[key];
    }
  }
  clean.GIT_TERMINAL_PROMPT = "0";
  return clean;
}

function ghEnvironment(baseEnvironment, token) {
  return {
    ...sanitizeGitEnvironment(baseEnvironment),
    GH_TOKEN: token,
  };
}

function gitArgs(args) {
  return [
    "--no-replace-objects",
    "-c",
    `core.hooksPath=${NULL_DEVICE}`,
    "-c",
    "commit.gpgSign=false",
    "-c",
    "core.fsmonitor=false",
    "-c",
    "credential.helper=",
    "-c",
    "credential.useHttpPath=true",
    ...args,
  ];
}

function run(command, args, { cwd, env, allowExitOne = false } = {}) {
  const result = spawnSync(resolveExecutable(command), args, {
    cwd,
    env,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(`${command} could not be started.`);
  }
  if (result.status !== 0 && !(allowExitOne && result.status === 1)) {
    throw new Error(`${command} failed with exit code ${result.status}.`);
  }
  return {
    status: result.status,
    stdout: String(result.stdout ?? "").trim(),
  };
}

function runGit(args, options) {
  return run("git", gitArgs(args), options);
}

function splitLines(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function githubOwnerFromRemote(remoteUrl) {
  const value = String(remoteUrl ?? "").trim();
  if (!value || !/^https:\/\//i.test(value)) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.hostname.toLowerCase() !== "github.com" ||
    url.username ||
    url.password
  ) {
    return null;
  }
  return url.pathname.split("/").filter(Boolean)[0] ?? null;
}

export function assertPushInputs({
  ghToken,
  login,
  branch = EXPECTED_GITHUB_BRANCH,
  remoteUrls,
  pushUrls,
  remoteUrl,
}) {
  if (typeof ghToken !== "string" || !ghToken) {
    throw new Error("GH_TOKEN is required only when --push is used.");
  }
  if (login !== EXPECTED_GITHUB_OWNER) {
    throw new Error(
      `GH_TOKEN must authenticate as ${EXPECTED_GITHUB_OWNER}; no commit was made.`,
    );
  }
  if (branch !== EXPECTED_GITHUB_BRANCH) {
    throw new Error(
      `Publication must run on branch ${EXPECTED_GITHUB_BRANCH}; no commit was made.`,
    );
  }
  const fetchTargets = remoteUrls ?? (remoteUrl ? [remoteUrl] : []);
  const pushTargets = pushUrls ?? fetchTargets;
  if (
    fetchTargets.length !== 1 ||
    pushTargets.length < 1 ||
    [...fetchTargets, ...pushTargets].some(
      (value) => value !== EXPECTED_GITHUB_REMOTE,
    )
  ) {
    throw new Error(
      `Git fetch and push targets must be exactly ${EXPECTED_GITHUB_REMOTE}; no commit was made.`,
    );
  }
}

function pathIsAllowed(candidate, allowedPaths) {
  const normalized = candidate.replaceAll("\\", "/").replace(/^\.\/+/, "");
  return allowedPaths.some(
    (allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`),
  );
}

function configuredUrls(root, environment, remote, push = false) {
  return splitLines(
    runGit(
      ["remote", "get-url", ...(push ? ["--push"] : []), "--all", remote],
      { cwd: root, env: environment },
    ).stdout,
  );
}

function changedPaths(root, environment) {
  return [
    ...new Set([
      ...splitLines(
        runGit(["diff", "--name-only"], { cwd: root, env: environment }).stdout,
      ),
      ...splitLines(
        runGit(["diff", "--cached", "--name-only"], {
          cwd: root,
          env: environment,
        }).stdout,
      ),
      ...splitLines(
        runGit(["ls-files", "--others", "--exclude-standard"], {
          cwd: root,
          env: environment,
        }).stdout,
      ),
    ]),
  ];
}

function rejectGitRedirects(root, environment) {
  const redirects = runGit(
    [
      "config",
      "--show-origin",
      "--get-regexp",
      "^url\\..*\\.(insteadOf|pushInsteadOf)$",
    ],
    {
      cwd: root,
      env: environment,
      allowExitOne: true,
    },
  ).stdout;
  if (redirects) {
    throw new Error("Git URL rewrite rules are forbidden for publication.");
  }
  const httpConfiguration = runGit(
    ["config", "--show-origin", "--get-regexp", "^http\\."],
    {
      cwd: root,
      env: environment,
      allowExitOne: true,
    },
  ).stdout;
  if (
    splitLines(httpConfiguration).some((line) =>
      /\bhttp(?:\.[^\s]+)?\.(?:extraheader|proxy|sslverify|sslcainfo|sslcapath)\s/i.test(
        line,
      ),
    )
  ) {
    throw new Error(
      "Git HTTP credentials, proxies, and TLS overrides are forbidden for publication.",
    );
  }
}

function fetchAndVerifyAncestry(root, environment, { allowRebase }) {
  runGit(
    [
      "-c",
      "http.sslVerify=true",
      "fetch",
      "--no-tags",
      "--prune",
      EXPECTED_GITHUB_REMOTE,
      `+refs/heads/${EXPECTED_GITHUB_BRANCH}:refs/remotes/origin/${EXPECTED_GITHUB_BRANCH}`,
    ],
    { cwd: root, env: environment },
  );
  const remoteRef = `refs/remotes/origin/${EXPECTED_GITHUB_BRANCH}`;
  let ancestry = runGit(
    ["merge-base", "--is-ancestor", remoteRef, "HEAD"],
    { cwd: root, env: environment, allowExitOne: true },
  );
  if (ancestry.status === 1 && allowRebase) {
    runGit(["rebase", remoteRef], { cwd: root, env: environment });
    ancestry = runGit(
      ["merge-base", "--is-ancestor", remoteRef, "HEAD"],
      { cwd: root, env: environment, allowExitOne: true },
    );
  }
  if (ancestry.status !== 0) {
    throw new Error(
      "Local main does not contain the fetched GitHub main; publication stopped before push.",
    );
  }
  return remoteRef;
}

function publicationHeadIsSafe(root, environment, allowedPaths) {
  if (!allowedPaths.length) return false;
  const subject = runGit(["log", "-1", "--format=%s"], {
    cwd: root,
    env: environment,
  }).stdout;
  const headPaths = splitLines(
    runGit(
      ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"],
      { cwd: root, env: environment },
    ).stdout,
  );
  return (
    subject === "Publish reviewed Chevrolet photo assets" &&
    headPaths.length > 0 &&
    headPaths.every((file) => pathIsAllowed(file, allowedPaths))
  );
}

export function verifyGitHubPublicationTarget({
  repoRoot,
  environment = process.env,
  remote = "origin",
  allowDirtyPaths = [],
  allowCleanAheadPaths = [],
}) {
  const root = path.resolve(repoRoot);
  if (remote !== "origin") {
    throw new Error("Publication requires the exact origin remote.");
  }
  const token = environment.GH_TOKEN;
  if (typeof token !== "string" || !token) {
    throw new Error("GH_TOKEN is required only when --push is used.");
  }
  const localEnv = sanitizeGitEnvironment(environment);
  const login = run(
    "gh",
    ["api", "--hostname", "github.com", "user", "--jq", ".login"],
    {
    cwd: root,
    env: ghEnvironment(environment, token),
    },
  ).stdout;
  const topLevel = runGit(["rev-parse", "--show-toplevel"], {
    cwd: root,
    env: localEnv,
  }).stdout;
  if (path.resolve(topLevel) !== root) {
    throw new Error("Repository root does not match the git top-level directory.");
  }
  const branch = runGit(["branch", "--show-current"], {
    cwd: root,
    env: localEnv,
  }).stdout;
  const remoteUrls = configuredUrls(root, localEnv, remote);
  const pushUrls = configuredUrls(root, localEnv, remote, true);
  assertPushInputs({
    ghToken: token,
    login,
    branch,
    remoteUrls,
    pushUrls,
  });
  rejectGitRedirects(root, localEnv);

  const dirty = changedPaths(root, localEnv);
  if (
    dirty.some((file) => !pathIsAllowed(file, allowDirtyPaths)) ||
    (!allowDirtyPaths.length && dirty.length)
  ) {
    throw new Error(
      "Refusing publication while files outside the exact publication output are modified.",
    );
  }
  const remoteRef = fetchAndVerifyAncestry(root, localEnv, {
    allowRebase: dirty.length === 0,
  });
  const aheadValue = runGit(
    ["rev-list", "--count", `${remoteRef}..HEAD`],
    { cwd: root, env: localEnv },
  ).stdout;
  const aheadCommits = Number(aheadValue);
  if (!Number.isSafeInteger(aheadCommits) || aheadCommits < 0) {
    throw new Error("Could not verify local publication ancestry.");
  }
  const safePublicationRetry =
    dirty.length === 0 &&
    aheadCommits === 1 &&
    publicationHeadIsSafe(root, localEnv, allowCleanAheadPaths);
  if (aheadCommits > 0 && !safePublicationRetry) {
    throw new Error(
      "Local main contains unpushed commits outside a single verified publication retry.",
    );
  }
  return {
    verified: true,
    branch,
    remote: EXPECTED_GITHUB_REMOTE,
    aheadCommits,
    safePublicationRetry,
  };
}

async function startCredentialBroker(token) {
  const nonce = randomBytes(32).toString("hex");
  const server = createServer((socket) => {
    let request = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      request += chunk;
      if (request.length > 4096) socket.destroy();
    });
    socket.on("end", () => {
      let suppliedNonce = "";
      try {
        const parsed = JSON.parse(request);
        suppliedNonce = parsed.nonce;
        if (
          parsed.protocol !== "https" ||
          parsed.host !== "github.com" ||
          parsed.path !== "ipadmom/chevrolet-color-archive.git"
        ) {
          socket.destroy();
          return;
        }
      } catch {
        socket.destroy();
        return;
      }
      if (suppliedNonce !== nonce) {
        socket.destroy();
        return;
      }
      socket.end(
        JSON.stringify({
          username: "x-access-token",
          password: token,
        }),
      );
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not establish the process-local credential broker.");
  }
  return {
    port: address.port,
    nonce,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

async function pushExactRemote({ root, environment, token }) {
  const broker = await startCredentialBroker(token);
  const localEnv = {
    ...sanitizeGitEnvironment(environment),
    CHEVY_GIT_CREDENTIAL_PORT: String(broker.port),
    CHEVY_GIT_CREDENTIAL_NONCE: broker.nonce,
  };
  const nodeExecutable = process.execPath.replaceAll("\\", "/");
  const helperPath = CREDENTIAL_HELPER_PATH.replaceAll("\\", "/");
  const helperCommand = `!"${nodeExecutable}" "${helperPath}"`;
  const args = gitArgs([
    "-c",
    "http.sslVerify=true",
    "-c",
    "credential.helper=",
    "-c",
    `credential.helper=${helperCommand}`,
    "push",
    "--porcelain",
    EXPECTED_GITHUB_REMOTE,
    `HEAD:refs/heads/${EXPECTED_GITHUB_BRANCH}`,
  ]);
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(resolveExecutable("git"), args, {
        cwd: root,
        env: localEnv,
        stdio: ["ignore", "ignore", "ignore"],
        windowsHide: true,
      });
      child.once("error", () => reject(new Error("git could not be started.")));
      child.once("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`git failed with exit code ${code}.`));
      });
    });
  } finally {
    await broker.close();
  }
}

export async function withPublisherLock({ repoRoot, task }) {
  if (typeof task !== "function") {
    throw new Error("Publisher lock requires a task.");
  }
  const root = path.resolve(repoRoot);
  const rootKey = publisherRootKey(root);
  const lockPath = await acquirePublisherLock(root, rootKey);
  activePublisherLocks.add(rootKey);
  try {
    return await task();
  } finally {
    activePublisherLocks.delete(rootKey);
    await removeLockDirectory(lockPath);
  }
}

export async function commitAndPushPublication({
  repoRoot,
  publicationPaths,
  environment = process.env,
  remote = "origin",
}) {
  const root = path.resolve(repoRoot);
  if (!activePublisherLocks.has(publisherRootKey(root))) {
    throw new Error("Publication requires the repository publisher lock.");
  }
  if (!Array.isArray(publicationPaths) || !publicationPaths.length) {
    throw new Error("No publication paths were supplied for GitHub.");
  }
  const target = verifyGitHubPublicationTarget({
    repoRoot: root,
    environment,
    remote,
    allowDirtyPaths: publicationPaths,
    allowCleanAheadPaths: publicationPaths,
  });

  const localEnv = sanitizeGitEnvironment(environment);
  const token = environment.GH_TOKEN;
  const localChanges = runGit(
    ["status", "--porcelain", "--", ...publicationPaths],
    { cwd: root, env: localEnv },
  ).stdout;

  if (!localChanges) {
    if (target.aheadCommits === 0) {
      return {
        committed: false,
        pushed: true,
        reason: "already-published",
      };
    }
    await pushExactRemote({ root, environment, token });
    return { committed: false, pushed: true, reason: "retry-push" };
  }

  runGit(["add", "--", ...publicationPaths], { cwd: root, env: localEnv });
  const staged = splitLines(
    runGit(["diff", "--cached", "--name-only"], {
      cwd: root,
      env: localEnv,
    }).stdout,
  );
  if (staged.some((file) => !pathIsAllowed(file, publicationPaths))) {
    throw new Error("Refusing to commit files outside the publication output.");
  }
  if (!staged.length) {
    throw new Error("Publication paths produced no committable Git diff.");
  }

  runGit(
    [
      "commit",
      "-m",
      "Publish reviewed Chevrolet photo assets",
      "--",
      ...publicationPaths,
    ],
    { cwd: root, env: localEnv },
  );
  await pushExactRemote({ root, environment, token });
  return { committed: true, pushed: true };
}
