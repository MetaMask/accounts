// @ts-check
/* eslint-disable n/no-sync */

const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const packageFile = require('../package.json');

console.log('[preinstalled-snap] - attempt to build preinstalled snap');

/**
 * Read the contents of a file and return as a string.
 * @param {string} filePath - Path to file.
 * @returns {string} File as utf-8 string.
 */
function readFileContents(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file from disk: ${filePath}`, error);
    throw error;
  }
}

// Paths to the files
const bundlePath = require.resolve('../dist/bundle.js');
const iconPath = require.resolve('../images/icon.svg');
const manifestPath = require.resolve('../snap.manifest.json');

// File Contents
const bundle = readFileContents(bundlePath);
const icon = readFileContents(iconPath);
const manifest = readFileContents(manifestPath);

/**
 * @typedef {object} PreinstalledSnap
 * @property {string} snapId - The unique identifier for the snap.
 * @property {object} manifest - The parsed manifest for the snap.
 * @property {Array<object>} files - The list of files included in the snap.
 * @property {boolean} removable - Indicates if the snap is removable.
 */

/**
 * Constructs a snap ID using the package name.
 * @param {string} packageName - The name of the package.
 * @returns {string} The constructed snap ID.
 */
function constructSnapId(packageName) {
  return `npm:${packageName}`;
}

const snapId = constructSnapId(packageFile.name);

/**
 * @type {PreinstalledSnap}
 */
const preinstalledSnap = {
  snapId,
  manifest: JSON.parse(manifest),
  files: [
    {
      path: 'images/icon.svg',
      value: icon,
    },
    {
      path: 'dist/bundle.js',
      value: bundle,
    },
  ],
  removable: false,
};

// Write preinstalled-snap file
try {
  // Preinstalled Snap File
  const outputPath = join(__dirname, '..', 'dist/preinstalled-snap.json');
  writeFileSync(outputPath, JSON.stringify(preinstalledSnap, null, 0));

  console.log(
    `[preinstalled-snap] - successfully created preinstalled snap at ${outputPath}`,
  );
} catch (error) {
  console.error('Error writing combined file to disk:', error);
  throw error;
}
