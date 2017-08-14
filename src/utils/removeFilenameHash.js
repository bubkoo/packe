// `/User/dan/app/build/static/js/main.82be8.js` => `/static/js/main.js`
export default function removeFileNameHash(filename, parentDir) {
  const parts = filename.replace(parentDir, '').split('.');
  return parts.splice(parts.length - 2, 1).join('.');
}
