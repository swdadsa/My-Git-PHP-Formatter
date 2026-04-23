#!/usr/bin/env node

const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawn, execFileSync } = require("node:child_process");
const {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
} = require("vscode-jsonrpc");

function usage() {
  console.error("Usage: format-range <file.php> <startLine> <endLine>");
}

function parsePositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function splitLines(text) {
  return text.split(/\r?\n/);
}

function getLineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      starts.push(index + 1);
    }
  }
  return starts;
}

function positionToOffset(lineStarts, textLength, position) {
  const lineStart = lineStarts[position.line];
  if (lineStart === undefined) {
    return textLength;
  }
  return Math.min(lineStart + position.character, textLength);
}

function applyTextEdits(text, edits) {
  const lineStarts = getLineStarts(text);
  const normalized = edits.map((edit) => ({
    ...edit,
    startOffset: positionToOffset(lineStarts, text.length, edit.range.start),
    endOffset: positionToOffset(lineStarts, text.length, edit.range.end),
  }));

  normalized.sort((left, right) => {
    if (left.startOffset !== right.startOffset) {
      return right.startOffset - left.startOffset;
    }
    return right.endOffset - left.endOffset;
  });

  let nextText = text;
  for (const edit of normalized) {
    nextText =
      nextText.slice(0, edit.startOffset) +
      edit.newText +
      nextText.slice(edit.endOffset);
  }

  return nextText;
}

function findWorkspaceRoot(filePath) {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: path.dirname(filePath),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return path.dirname(filePath);
  }
}

function resolveIntelephenseBinary() {
  const packageJsonPath = require.resolve("intelephense/package.json");
  const packageDir = path.dirname(packageJsonPath);
  const packageJson = require(packageJsonPath);
  const relativeBin =
    typeof packageJson.bin === "string"
      ? packageJson.bin
      : packageJson.bin && packageJson.bin.intelephense;

  if (!relativeBin) {
    throw new Error("Could not resolve the intelephense binary.");
  }

  return path.join(packageDir, relativeBin);
}

async function openConnection() {
  const storagePath = path.join(os.tmpdir(), "intelephense-storage");
  const globalStoragePath = path.join(os.homedir(), ".intelephense");
  const intelephenseBin = resolveIntelephenseBinary();
  const server = spawn(process.execPath, [intelephenseBin, "--stdio"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stderr = "";
  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const connection = createMessageConnection(
    new StreamMessageReader(server.stdout),
    new StreamMessageWriter(server.stdin)
  );
  connection.listen();

  return {
    connection,
    server,
    stderrRef: () => stderr,
    initializationOptions: {
      storagePath,
      globalStoragePath,
    },
  };
}

async function shutdownConnection(connection, server) {
  try {
    await connection.sendRequest("shutdown");
  } catch {}

  try {
    await connection.sendNotification("exit");
  } catch {}

  connection.dispose();

  if (!server.killed) {
    server.kill();
  }
}

async function main() {
  const [, , fileArg, startArg, endArg] = process.argv;

  if (!fileArg || !startArg || !endArg) {
    usage();
    process.exitCode = 1;
    return;
  }

  const filePath = path.resolve(fileArg);
  const startLine = parsePositiveInteger(startArg, "startLine");
  const endLine = parsePositiveInteger(endArg, "endLine");

  if (endLine < startLine) {
    throw new Error("endLine must be greater than or equal to startLine.");
  }

  const originalText = await fs.readFile(filePath, "utf8");
  const lines = splitLines(originalText);

  if (startLine > lines.length || endLine > lines.length) {
    throw new Error(`File only has ${lines.length} line(s).`);
  }

  const workspaceRoot = findWorkspaceRoot(filePath);
  const fileUri = pathToFileURL(filePath).href;
  const workspaceUri = pathToFileURL(workspaceRoot).href;
  const startLineIndex = startLine - 1;
  const endLineIndex = endLine - 1;

  const { connection, server, stderrRef, initializationOptions } =
    await openConnection();

  try {
    const initializeResult = await connection.sendRequest("initialize", {
      processId: process.pid,
      rootUri: workspaceUri,
      workspaceFolders: [
        {
          uri: workspaceUri,
          name: path.basename(workspaceRoot),
        },
      ],
      capabilities: {},
      initializationOptions,
    });

    if (!initializeResult.capabilities.documentRangeFormattingProvider) {
      throw new Error(
        "Intelephense did not advertise document range formatting support."
      );
    }

    await connection.sendNotification("initialized", {});

    await connection.sendNotification("textDocument/didOpen", {
      textDocument: {
        uri: fileUri,
        languageId: "php",
        version: 1,
        text: originalText,
      },
    });

    const edits = await connection.sendRequest("textDocument/rangeFormatting", {
      textDocument: { uri: fileUri },
      range: {
        start: { line: startLineIndex, character: 0 },
        end: { line: endLineIndex, character: lines[endLineIndex].length },
      },
      options: {
        tabSize: 4,
        insertSpaces: true,
      },
    });

    const nextText = applyTextEdits(originalText, edits || []);

    if (nextText !== originalText) {
      await fs.writeFile(filePath, nextText, "utf8");
      console.log(
        `Formatted ${path.relative(process.cwd(), filePath) || path.basename(filePath)}:${startLine}-${endLine}`
      );
    } else {
      console.log(
        `No changes for ${path.relative(process.cwd(), filePath) || path.basename(filePath)}:${startLine}-${endLine}`
      );
    }
  } catch (error) {
    const stderr = stderrRef().trim();
    if (stderr) {
      error.message = `${error.message}\n[intelephense stderr]\n${stderr}`;
    }
    throw error;
  } finally {
    await shutdownConnection(connection, server);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
