import { sync as gzipSize } from 'gzip-size';
import readFile from './readFile';
import removeFilenameHash from './removeFilenameHash';

export default function getFileSizeMap(filePaths = [], appBuild) {
  return filePaths
    .filter(filePath => /\.(js|csc)$/.test(filePath))
    .reduce((memo, filePath) => {
      const fileName = filePath.replace(appBuild, '').substr(1);
      const key = removeFilenameHash(fileName);
      const content = readFile(filePath);
      memo[key] = gzipSize(content);
      return memo;
    }, {});
}
