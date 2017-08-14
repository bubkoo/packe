// `/User/dan/app/build/static/js/main.82be8.js` => `/static/js/main.js`
export default function removeFileNameHash(fileName) {
  return fileName.replace(/\/?(.*)(\.\w+)(\.js|\.css)/, (match, p1, p2, p3) => p1 + p3);
}
