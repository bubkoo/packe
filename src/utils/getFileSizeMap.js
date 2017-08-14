import { sync as gzipSize } from 'gzip-size';
import readFile from './readFile';
import removeFilenameHash from './removeFilenameHash';

export default function getFileSizeMap(filePaths = []) {
  return filePaths.filter(path => /\.(js|css)$/.test(path))
    .reduce((memo, path) => {
      const key = removeFilenameHash(path);
      const content = readFile(path);
      memo[key] = gzipSize(content);
      return memo;
    }, {});
}
