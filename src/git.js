const path = require("node:path");
const fs = require("node:fs");
const { execFile } = require("node:child_process");
const vscode = require("vscode");

function execGit(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) {
        const message = stderr.trim() || error.message;
        reject(new Error(message));
        return;
      }

      resolve(stdout);
    });
  });
}

async function collectChangedPhpFiles(workspaceFolders, log) {
  const results = [];
  const seenRepos = new Set();

  for (const folder of workspaceFolders) {
    const repoRoot = await findRepoRoot(folder.uri.fsPath);
    if (!repoRoot || seenRepos.has(repoRoot)) {
      continue;
    }

    seenRepos.add(repoRoot);
    log(`Scanning git changes in ${repoRoot}`);

    const tracked = await listTrackedPhpChanges(repoRoot);
    const untracked = await listUntrackedPhpFiles(repoRoot);
    const fileMap = new Map();

    for (const entry of tracked) {
      fileMap.set(entry.relativePath, entry);
    }

    for (const relativePath of untracked) {
      fileMap.set(relativePath, {
        relativePath,
        uri: vscode.Uri.file(path.join(repoRoot, relativePath)),
        isNew: true,
        ranges: [],
      });
    }

    for (const entry of fileMap.values()) {
      if (!entry.isNew) {
        entry.ranges = await getDiffRanges(repoRoot, entry.relativePath);
      }

      if (entry.isNew || entry.ranges.length > 0) {
        results.push(entry);
      }
    }
  }

  return results.sort((left, right) => left.uri.fsPath.localeCompare(right.uri.fsPath));
}

async function getDocumentChangeInfo(uri, log) {
  if (uri.scheme !== "file") {
    return null;
  }

  const repoRoot = await findRepoRoot(uri.fsPath);
  if (!repoRoot) {
    return null;
  }

  const relativePath = path.relative(repoRoot, uri.fsPath);
  const tracked = await listTrackedPhpChanges(repoRoot);
  const trackedEntry = tracked.find((entry) => entry.relativePath === relativePath);

  if (trackedEntry) {
    if (trackedEntry.isNew) {
      log(`Detected new tracked PHP file: ${relativePath}`);
      return {
        hasChanges: true,
        isNew: true,
        ranges: [],
      };
    }

    const ranges = await getDiffRanges(repoRoot, relativePath);
    return {
      hasChanges: ranges.length > 0,
      isNew: false,
      ranges,
    };
  }

  const untracked = await listUntrackedPhpFiles(repoRoot);
  if (untracked.includes(relativePath)) {
    log(`Detected untracked PHP file: ${relativePath}`);
    return {
      hasChanges: true,
      isNew: true,
      ranges: [],
    };
  }

  return {
    hasChanges: false,
    isNew: false,
    ranges: [],
  };
}

async function findRepoRoot(startPath) {
  try {
    const stat = fs.statSync(startPath);
    const cwd = stat.isDirectory() ? startPath : path.dirname(startPath);
    const stdout = await execGit(["rev-parse", "--show-toplevel"], cwd);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function listTrackedPhpChanges(repoRoot) {
  const hasHead = await repositoryHasHead(repoRoot);
  const modifiedFiles = hasHead
    ? await listNameOnly(repoRoot, [
        "diff",
        "HEAD",
        "--name-only",
        "--diff-filter=M",
        "--no-renames",
        ...getPhpPathspecArgs(),
      ])
    : [];
  const addedFiles = hasHead
    ? await listNameOnly(repoRoot, [
        "diff",
        "HEAD",
        "--name-only",
        "--diff-filter=A",
        "--no-renames",
        ...getPhpPathspecArgs(),
      ])
    : await listNameOnly(repoRoot, ["ls-files", "--cached", ...getPhpPathspecArgs()]);
  const entries = [];

  for (const relativePath of modifiedFiles) {
    entries.push({
      relativePath,
      uri: vscode.Uri.file(path.join(repoRoot, relativePath)),
      isNew: false,
      ranges: [],
    });
  }

  for (const relativePath of addedFiles) {
    entries.push({
      relativePath,
      uri: vscode.Uri.file(path.join(repoRoot, relativePath)),
      isNew: true,
      ranges: [],
    });
  }

  return entries;
}

async function listUntrackedPhpFiles(repoRoot) {
  const stdout = await execGit(
    ["ls-files", "--others", "--exclude-standard", ...getPhpPathspecArgs()],
    repoRoot
  );

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function getDiffRanges(repoRoot, relativePath) {
  if (!(await repositoryHasHead(repoRoot))) {
    return [];
  }

  const stdout = await execGit(
    ["diff", "HEAD", "--unified=0", "--no-color", "--", relativePath],
    repoRoot
  );

  return mergeRanges(parseDiffRanges(stdout));
}

function parseDiffRanges(diffText) {
  const ranges = [];
  const regex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

  for (const line of diffText.split(/\r?\n/)) {
    const match = line.match(regex);
    if (!match) {
      continue;
    }

    const startLine = Number(match[1]);
    const lineCount = match[2] ? Number(match[2]) : 1;

    if (lineCount <= 0) {
      continue;
    }

    ranges.push({
      startLine,
      endLine: startLine + lineCount - 1,
    });
  }

  return ranges;
}

function mergeRanges(ranges) {
  if (ranges.length <= 1) {
    return ranges;
  }

  const sorted = [...ranges].sort((left, right) => left.startLine - right.startLine);
  const merged = [sorted[0]];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = merged[merged.length - 1];

    if (current.startLine <= previous.endLine + 1) {
      previous.endLine = Math.max(previous.endLine, current.endLine);
      continue;
    }

    merged.push(current);
  }

  return merged;
}

async function repositoryHasHead(repoRoot) {
  try {
    await execGit(["rev-parse", "--verify", "HEAD"], repoRoot);
    return true;
  } catch {
    return false;
  }
}

async function listNameOnly(repoRoot, args) {
  const stdout = await execGit(args, repoRoot);
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getPhpPathspecArgs() {
  return ["--", "*.php", ":(glob)**/*.php"];
}

module.exports = {
  collectChangedPhpFiles,
  getDocumentChangeInfo,
};
