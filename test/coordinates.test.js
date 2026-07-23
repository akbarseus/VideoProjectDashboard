import test from "node:test";
import assert from "node:assert/strict";
import { parseKoordinat } from "../src/utils/coordinates.js";

test("parseKoordinat parses decimal format", () => {
  const result = parseKoordinat("3.596856700702738, 98.68126230986603");
  assert.ok(result);
  assert.equal(result.lat, 3.596856700702738);
  assert.equal(result.lng, 98.68126230986603);
});

test("parseKoordinat parses DMS format with S/E direction", () => {
  const result = parseKoordinat(`6°49'12.9"S 110°48'35.4"E`);
  assert.ok(result);
  assert.ok(result.lat < 0); // S = negative
  assert.ok(result.lng > 0); // E = positive
  assert.ok(Math.abs(result.lat - -6.82025) < 0.001);
  assert.ok(Math.abs(result.lng - 110.80983) < 0.001);
});

test("parseKoordinat parses another DMS sample", () => {
  const result = parseKoordinat(`6°31'39.4"S 107°41'42.0"E`);
  assert.ok(result);
  assert.ok(Math.abs(result.lat - -6.52761) < 0.001);
  assert.ok(Math.abs(result.lng - 107.69500) < 0.001);
});

test("parseKoordinat returns null for empty/whitespace/unrecognized input", () => {
  assert.equal(parseKoordinat(""), null);
  assert.equal(parseKoordinat("   "), null);
  assert.equal(parseKoordinat(null), null);
  assert.equal(parseKoordinat(undefined), null);
  assert.equal(parseKoordinat("Sinar Mulia Plasindo Lestari Phase 2"), null);
});
