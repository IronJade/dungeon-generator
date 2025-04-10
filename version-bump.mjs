import { readFileSync, writeFileSync } from "fs";

// Read manifest file
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));

// Read version from package.json
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const currentVersion = packageJson.version;

// Make sure manifest.json version is synced
manifest.version = currentVersion;

// Write updated manifest
writeFileSync("manifest.json", JSON.stringify(manifest, null, 2));

// Check if versions.json exists, create it if not
try {
    const versions = JSON.parse(readFileSync("versions.json", "utf8"));
    
    // Add/update the latest version
    versions[currentVersion] = manifest.minAppVersion;
    
    // Write updated versions
    writeFileSync("versions.json", JSON.stringify(versions, null, 2));
} catch (error) {
    // File doesn't exist, create it
    const versions = {};
    versions[currentVersion] = manifest.minAppVersion;
    writeFileSync("versions.json", JSON.stringify(versions, null, 2));
}

console.log(`Version bumped to ${currentVersion}`);