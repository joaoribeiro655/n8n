"use strict";

/** Persistência simples de configurações no diretório de dados do app. */

const { app } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

function file() {
  return path.join(app.getPath("userData"), "config.json");
}

function read() {
  try {
    return JSON.parse(fs.readFileSync(file(), "utf8"));
  } catch {
    return {};
  }
}

function write(obj) {
  try {
    fs.writeFileSync(file(), JSON.stringify(obj, null, 2));
  } catch {
    /* ignora falha de escrita de config */
  }
}

module.exports = { read, write };
