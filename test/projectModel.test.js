import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStatus } from "../src/config/statuses.js";
import { normalizeProject } from "../src/data/projectModel.js";

test("normalizeStatus maps known Sheet variants to canonical keys", () => {
  assert.equal(normalizeStatus("PUBLISHED"), "published");
  assert.equal(normalizeStatus("On Progress"), "onprogress");
  assert.equal(normalizeStatus("on schedule"), "onschedule");
  assert.equal(normalizeStatus(""), "na");
  assert.equal(normalizeStatus("unexpected value"), "na");
});

test("normalizeProject accepts backend aliases and applies defaults", () => {
  const project = normalizeProject({
    id: "P-1",
    tahun: "ignored",
    year: 2026,
    nama: "Project Alias",
    sektor: "Retail",
    status: "publish",
    statusDoc: "TRUE",
  });

  assert.equal(project.id, "P-1");
  assert.equal(project.year, "2026");
  assert.equal(project.name, "Project Alias");
  assert.equal(project.industry, "Retail");
  assert.equal(project.statusVideo, "published");
  assert.equal(project.statusDoc, true);
  assert.equal(project.linkYoutube, "");
});

test("normalizeProject passes statusLevel through raw, defaulting to empty string", () => {
  assert.equal(normalizeProject({ statusLevel: "L5" }).statusLevel, "L5");
  assert.equal(normalizeProject({ statusLevel: "LX" }).statusLevel, "LX");
  assert.equal(normalizeProject({}).statusLevel, "");
});

test("normalizeProject preserves production and schedule notes", () => {
  const project = normalizeProject({
    catatanProduksi: "Editing",
    catatanSchedule: "August",
  }, 4);

  assert.equal(project.id, "row-4");
  assert.equal(project.catatanProduksi, "Editing");
  assert.equal(project.catatanSchedule, "August");
});
