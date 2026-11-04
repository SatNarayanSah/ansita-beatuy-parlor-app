/**
 * Builds the Android APK on EAS (Expo's servers) and saves it into ./builds/,
 * so there's no QR code or phone download involved.
 *
 *   npm run build:apk                 # "preview" profile: installable .apk on the live server
 *   npm run build:apk -- --profile device
 *
 * Needs `eas login` once. The very first build asks to create the Android signing key:
 * run `eas build -p android --profile preview` once by hand and answer "Yes" if this script
 * stops at that step. Expo keeps the key; every later build reuses it.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createWriteStream, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const profileAt = args.indexOf("--profile");
const profile = profileAt >= 0 ? args[profileAt + 1] : "preview";

const { expo } = JSON.parse(readFileSync(join(root, "app.json"), "utf8"));
console.log(`Building ${expo.name} ${expo.version} (profile "${profile}") on EAS. This usually takes 10-20 minutes...`);

const easArgs = ["build", "-p", "android", "--profile", profile, "--non-interactive", "--wait", "--json"];
// Windows runs eas through cmd.exe explicitly (no `shell: true`, so arguments aren't re-parsed by a shell).
const [command, commandArgs] =
  process.platform === "win32" ? ["cmd.exe", ["/d", "/c", "eas.cmd", ...easArgs]] : ["eas", easArgs];
const result = spawnSync(command, commandArgs, {
  cwd: root,
  encoding: "utf8",
  stdio: ["inherit", "pipe", "inherit"], // progress shows on screen; the JSON result is captured
  maxBuffer: 64 * 1024 * 1024,
});
if (result.status !== 0) {
  console.error(`\nThe EAS build did not finish (exit code ${result.status}). See the messages above.`);
  process.exit(result.status ?? 1);
}

const builds = JSON.parse(result.stdout.slice(result.stdout.indexOf("[")));
const build = builds.find((b) => b.platform === "ANDROID") ?? builds[0];
const url = build?.artifacts?.applicationArchiveUrl ?? build?.artifacts?.buildUrl;
if (!url) {
  console.error("The build finished but EAS returned no download link:", JSON.stringify(build, null, 2));
  process.exit(1);
}

mkdirSync(join(root, "builds"), { recursive: true });
const ext = url.split("?")[0].endsWith(".aab") ? "aab" : "apk";
const file = join(root, "builds", `ansita-parlor-${expo.version}-${profile}.${ext}`);
const response = await fetch(url);
if (!response.ok || !response.body) {
  console.error(`Download failed: HTTP ${response.status}`);
  process.exit(1);
}
await pipeline(Readable.fromWeb(response.body), createWriteStream(file));
const sizeMb = (Number(execFileSync(process.execPath, ["-e", `console.log(require("fs").statSync(${JSON.stringify(file)}).size)`]).toString()) / 1e6).toFixed(1);
console.log(`\nSaved: ${file} (${sizeMb} MB)`);
console.log("Copy it to an Android phone (USB, Google Drive, WhatsApp...) and open it to install.");
