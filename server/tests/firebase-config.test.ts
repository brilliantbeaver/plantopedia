import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { parseConfig } from "../src/config/env.js";

const credential = { fixture: true };
const cert = jest.fn(() => credential);
const initializeApp = jest.fn(() => ({}));
const bucket = jest.fn(() => ({}));
const getFirestore = jest.fn(() => ({}));
jest.unstable_mockModule("firebase-admin/app", () => ({ cert, initializeApp }));
jest.unstable_mockModule("firebase-admin/firestore", () => ({
  getFirestore,
  FieldValue: {},
  FieldPath: {},
}));
jest.unstable_mockModule("firebase-admin/storage", () => ({
  getStorage: jest.fn(() => ({ bucket })),
}));
const { createFirebase } = await import("../src/storage/firebase.js");

const env = {
  NODE_ENV: "test",
  CLERK_SECRET_KEY: "fixture",
  CLERK_ISSUER_URL: "https://fixture.clerk.accounts.dev",
  FIREBASE_PROJECT_ID: "demo-plantopedia",
  FIREBASE_STORAGE_BUCKET: "demo-bucket",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
};
const originalFirestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const originalStorageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

beforeEach(() => {
  jest.clearAllMocks();
  cert.mockReset().mockReturnValue(credential);
});
afterEach(() => {
  if (originalFirestoreHost === undefined)
    delete process.env.FIRESTORE_EMULATOR_HOST;
  else process.env.FIRESTORE_EMULATOR_HOST = originalFirestoreHost;
  if (originalStorageHost === undefined)
    delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  else process.env.FIREBASE_STORAGE_EMULATOR_HOST = originalStorageHost;
});

test("emulator startup ignores unused hosted credentials, even malformed ones", () => {
  cert.mockImplementationOnce(() => {
    throw new Error("Unused credentials must not be parsed in emulator mode");
  });
  createFirebase(
    parseConfig({
      ...env,
      FIREBASE_CLIENT_EMAIL: "fixture@example.invalid",
      FIREBASE_PRIVATE_KEY: "a-key-id-is-not-a-private-key",
    }),
  );
  expect(cert).not.toHaveBeenCalled();
  expect(initializeApp).toHaveBeenCalledWith(
    { projectId: "demo-plantopedia", storageBucket: "demo-bucket" },
    expect.any(String),
  );
  expect(process.env.FIRESTORE_EMULATOR_HOST).toBe("127.0.0.1:8080");
  expect(process.env.FIREBASE_STORAGE_EMULATOR_HOST).toBe("127.0.0.1:9199");
  expect(getFirestore).toHaveBeenCalledWith(expect.anything(), "(default)");
});

test("hosted startup uses the service account and normalizes escaped newlines", () => {
  createFirebase(
    parseConfig({
      ...env,
      USE_FIREBASE_EMULATORS: "false",
      FIREBASE_PROJECT_ID: "fixture-project",
      FIRESTORE_EMULATOR_HOST: "",
      FIREBASE_STORAGE_EMULATOR_HOST: "",
      FIREBASE_CLIENT_EMAIL: "fixture@example.invalid",
      FIREBASE_PRIVATE_KEY: privateKey.replace(/\n/g, "\\n"),
    }),
  );
  expect(cert).toHaveBeenCalledWith({
    projectId: "fixture-project",
    clientEmail: "fixture@example.invalid",
    privateKey,
  });
  expect(initializeApp).toHaveBeenCalledWith(
    expect.objectContaining({ credential }),
    expect.any(String),
  );
});

test("hosted startup allows configured application-default identity", () => {
  createFirebase(
    parseConfig({
      ...env,
      USE_FIREBASE_EMULATORS: "false",
      FIREBASE_PROJECT_ID: "fixture-project",
      FIRESTORE_EMULATOR_HOST: "",
      FIREBASE_STORAGE_EMULATOR_HOST: "",
    }),
  );
  expect(cert).not.toHaveBeenCalled();
  expect(initializeApp).toHaveBeenCalledWith(
    { projectId: "fixture-project", storageBucket: "demo-bucket" },
    expect.any(String),
  );
});

test("a named database is selected explicitly while retaining the configured project and credentials", () => {
  createFirebase(
    parseConfig({
      ...env,
      USE_FIREBASE_EMULATORS: "false",
      FIREBASE_PROJECT_ID: "fixture-project",
      FIRESTORE_DATABASE_ID: "plantopedia-db",
      FIRESTORE_EMULATOR_HOST: "",
      FIREBASE_STORAGE_EMULATOR_HOST: "",
      FIREBASE_CLIENT_EMAIL: "fixture@example.invalid",
      FIREBASE_PRIVATE_KEY: privateKey,
    }),
  );
  expect(getFirestore).toHaveBeenCalledWith(
    expect.anything(),
    "plantopedia-db",
  );
  expect(cert).toHaveBeenCalledWith(
    expect.objectContaining({ projectId: "fixture-project" }),
  );
});
