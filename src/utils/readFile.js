import { readFileSync } from 'fs';


export default function readFile(filePath) {
  return readFileSync(filePath, 'utf8');
}
