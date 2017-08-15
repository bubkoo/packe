import assert from 'assert';
import { basename, extname, sep } from 'path';
import glob from 'glob';
import isPlainObject from 'is-plain-object';

const DEFAULT_ENTRY = './src/index.js';

function getEntry(name, path, isBuild) {
  const key = name || basename(path, extname(path));
  const value = isBuild
    ? [path]
    : [
      require.resolve('react-dev-utils/webpackHotDevClient'),
      path,
    ];

  return {
    [key]: value,
  };
}

export function getFiles(entry, cwd) {
  if (Array.isArray(entry)) {
    return entry.reduce((memo, entryItem) => memo.concat(getFiles(entryItem, cwd)), []);
  }

  assert(
    typeof entry === 'string',
    `getEntry/getFiles: entry type should be string, but got ${typeof entry}`,
  );

  const files = glob.sync(entry, { cwd });
  return files.map(file => ((file.charAt(0) === '.') ? file : `.${sep}${file}`));
}

export function getEntries(files, isBuild) {
  return files.reduce((memo, file) => ({
    ...memo,
    ...getEntry(null, file, isBuild),
  }), {});
}


export default function (config, appDirectory, isBuild) {
  const { entry } = config;

  if (isPlainObject(entry)) {
    if (isBuild) {
      return entry;
    }

    return Object.keys(entry).reduce((memo, name) => ({
      ...memo,
      ...getEntry(name, entry[name], isBuild),
    }), {});
  }

  const files = entry ? getFiles(entry, appDirectory) : [DEFAULT_ENTRY];
  return getEntries(files, isBuild);
}
