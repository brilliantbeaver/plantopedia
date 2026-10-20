import { expect, test } from "@jest/globals";
import { webAuthConfigurationError } from "../../src/config/web-auth.js";
test.each(["localhost", "127.0.0.1", "[::1]", "10.0.0.2", "app.localhost"])(
  "blocks production Clerk before mounting it on local web host %s",
  (host) => {
    expect(webAuthConfigurationError("pk_live_fixture", host)).toContain(
      "npm run web:local",
    );
  },
);
test("accepts a development key on localhost and the production key on its deployed host", () => {
  expect(webAuthConfigurationError("pk_test_fixture", "localhost")).toBeNull();
  expect(
    webAuthConfigurationError("pk_live_fixture", "plantopedia-nine.vercel.app"),
  ).toBeNull();
});
