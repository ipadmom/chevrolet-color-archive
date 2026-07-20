#!/usr/bin/env node

import { connect } from "node:net";

const operation = process.argv[2];
if (operation !== "get") process.exit(0);

const port = Number(process.env.CHEVY_GIT_CREDENTIAL_PORT);
const nonce = process.env.CHEVY_GIT_CREDENTIAL_NONCE;
if (!Number.isSafeInteger(port) || port < 1 || !nonce) process.exit(1);

let request = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  request += chunk;
  if (request.length > 4096) process.exit(1);
});
process.stdin.on("end", () => {
  const fields = new Map();
  for (const line of request.split(/\r?\n/).filter(Boolean)) {
    const separator = line.indexOf("=");
    if (separator < 1) process.exit(1);
    const key = line.slice(0, separator);
    if (fields.has(key)) process.exit(1);
    fields.set(key, line.slice(separator + 1));
  }
  const credentialRequest = {
    protocol: fields.get("protocol"),
    host: fields.get("host"),
    path: fields.get("path"),
  };
  if (
    credentialRequest.protocol !== "https" ||
    credentialRequest.host !== "github.com" ||
    credentialRequest.path !== "ipadmom/chevrolet-color-archive.git"
  ) {
    process.exit(1);
  }

  let response = "";
  const socket = connect({ host: "127.0.0.1", port }, () => {
    socket.end(JSON.stringify({ nonce, ...credentialRequest }));
  });
  socket.setEncoding("utf8");
  socket.on("data", (chunk) => {
    response += chunk;
    if (response.length > 4096) socket.destroy();
  });
  socket.on("end", () => {
    try {
      const credential = JSON.parse(response);
      if (
        credential.username !== "x-access-token" ||
        typeof credential.password !== "string" ||
        !credential.password
      ) {
        process.exitCode = 1;
        return;
      }
      process.stdout.write(
        `username=${credential.username}\npassword=${credential.password}\n\n`,
      );
    } catch {
      process.exitCode = 1;
    }
  });
  socket.on("error", () => {
    process.exitCode = 1;
  });
});
process.stdin.on("error", () => {
  process.exitCode = 1;
});
