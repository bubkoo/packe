export default function (stats, fn) {
  if (stats && Array.isArray(stats)) {
    return stats.map(fn);
  }
  return fn(stats);
}
