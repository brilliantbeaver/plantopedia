import { copyFile, chmod } from "node:fs/promises";
import { constants } from "node:fs";
try {
  await copyFile(".env.example", ".env", constants.COPYFILE_EXCL);
  console.log("Created .env with dummy values. Configure it locally.");
} catch (error) {
  if (error?.code !== "EEXIST") throw error;
  console.log("Existing .env preserved.");
}
await chmod(".env", 0o600);
