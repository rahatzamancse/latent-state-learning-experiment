/**
 * This function reads a file from the project directory.
 * @param filePath The path relative to the root of the project
 * @returns The content of the file in string format (encoded in UTF-8)
 */
export function readFile(filePath: string) {
  return fetch(filePath).then((response) => response.text());
}

export function shuffleIndices(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
}