/* eslint-disable no-console */

import path from 'path';
import chalk from 'chalk';
import filesize from 'filesize';
import stripAnsi from 'strip-ansi';
import { sync as gzipSize } from 'gzip-size';
import readFile from './readFile';
import removeFilenameHash from './removeFilenameHash';


// 1024, 2048 => "(+1 KB)"
function getDifferenceLabel(currentSize, previousSize) {
  const FIFTY_KILOBYTES = 1024 * 50;
  const difference = currentSize - previousSize;
  const fileSize = !Number.isNaN(difference) ? filesize(difference) : 0;
  if (difference >= FIFTY_KILOBYTES) {
    return chalk.red(`+${fileSize}`);
  } else if (difference < FIFTY_KILOBYTES && difference > 0) {
    return chalk.yellow(`+${fileSize}`);
  } else if (difference < 0) {
    return chalk.green(fileSize);
  }
  return '';
}

export default function printFileSizes({ stats, previousSizeMap, appBuild, outputPath }) {
  const assets = stats.toJson().assets
    .filter(asset => /\.(js|css)$/.test(asset.name))
    .map((asset) => {
      const content = readFile(`${appBuild}/${asset.name}`);
      const size = gzipSize(content);
      const previousSize = previousSizeMap[removeFilenameHash(asset.name)];
      const difference = getDifferenceLabel(size, previousSize);

      return {
        size,
        name: path.basename(asset.name),
        folder: path.join(outputPath, path.dirname(asset.name)),
        sizeLabel: filesize(size) + (difference ? ` (${difference})` : ''),
      };
    });

  assets.sort((a, b) => b.size - a.size);

  const maxLength = Math.max.apply(
    null,
    assets.map(a => stripAnsi(a.sizeLabel).length),
  );

  assets.forEach((asset) => {
    const length = stripAnsi(asset.sizeLabel).length;
    const sizeLabel = length < maxLength
      ? asset.sizeLabel + ' '.repeat(maxLength - length)
      : asset.sizeLabel;

    console.log(`  ${sizeLabel}  ${chalk.dim(asset.folder + path.sep)}${chalk.cyan(asset.name)}`);
  });
}
