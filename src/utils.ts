/**
 * This function reads a file from the project directory.
 * @param filePath The path relative to the root of the project
 * @returns The content of the file in string format (encoded in UTF-8)
 */
export function readFile(filePath: string) {
  return fetch(filePath).then((response) => response.text());
}

export function shuffleIndices(n: number) {
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}