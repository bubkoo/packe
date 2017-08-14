import { sync as gzipSize } from 'gzip-size';
import readFile from './readFile';
import removeFilenameHash from './removeFilenameHash';

export default function getFileSizeMap(filePaths = [], appBuild) {
  return filePaths.filter(path => /\.(js|css)$/.test(path))
    .reduce((memo, path) => {
      let fileName = path.replace(appBuild, '');
      if (fileName.charAt(0) === '/') {
        fileName = fileName.substr(1);
      }

      const key = removeFilenameHash(fileName);
      const content = readFile(path);
      memo[key] = gzipSize(content);
      return memo;
    }, {});
}
