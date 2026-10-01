/**
 * Inlines `process.env.MYSIMOKA_*` at build time (Metro, Jest, webpack).
 *
 * React Native has no runtime `process.env`, so without this every
 * `MYSIMOKA_*` lookup is `undefined` in release bundles. Only names starting
 * with `MYSIMOKA_` are touched; unset variables become `undefined` so the app
 * falls back to its defaults. Values come from the build shell environment,
 * then from an optional `.env` file in the project root (gitignored).
 *
 * Metro caches transformed files: after changing a value run
 * `npm run start:reset` (Metro `--reset-cache`) before building.
 */
const fs = require('fs');
const path = require('path');

const PREFIX = 'MYSIMOKA_';

function readDotEnv(rootDir) {
  const result = {};
  try {
    const content = fs.readFileSync(path.join(rootDir, '.env'), 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }
      const match = /^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match || !match[1].startsWith(PREFIX)) {
        continue;
      }
      result[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch {
    // No .env file: shell environment only.
  }
  return result;
}

module.exports = function inlineMysimokaEnv({ types: t }) {
  const fileEnv = readDotEnv(path.resolve(__dirname, '..'));

  function lookup(name) {
    const fromShell = process.env[name];
    if (typeof fromShell === 'string' && fromShell !== '') {
      return fromShell;
    }
    return fileEnv[name];
  }

  return {
    name: 'inline-mysimoka-env',
    visitor: {
      MemberExpression(nodePath) {
        const { node } = nodePath;
        // Match `process.env.MYSIMOKA_X` (not computed access).
        if (
          node.computed ||
          !t.isIdentifier(node.property) ||
          !node.property.name.startsWith(PREFIX) ||
          !t.isMemberExpression(node.object) ||
          node.object.computed ||
          !t.isIdentifier(node.object.object, { name: 'process' }) ||
          !t.isIdentifier(node.object.property, { name: 'env' })
        ) {
          return;
        }
        if (nodePath.parentPath.isAssignmentExpression({ left: node })) {
          return;
        }
        const value = lookup(node.property.name);
        nodePath.replaceWith(
          typeof value === 'string' ? t.stringLiteral(value) : t.identifier('undefined'),
        );
      },
    },
  };
};
