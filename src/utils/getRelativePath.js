
export default function getRelativePath(fullPath, parentDir) {
  if (fullPath && parentDir) {
    let result = fullPath.replace(parentDir, '');
    if (result.charAt(0) === '/') {
      result = result.substr(1);
    }

    return result;
  }

  return fullPath;
}
