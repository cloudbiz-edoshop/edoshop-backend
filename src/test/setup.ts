/* eslint-disable node/no-process-env */
import { beforeAll } from "vitest";

// Setup code that runs before all tests
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
});
