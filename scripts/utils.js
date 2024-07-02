/**
 * This function reads a file from the project directory.
 * @param filePath The path relative to the root of the project
 * @returns The content of the file in string format (encoded in UTF-8)
 */
function readFile(filePath) {
  return fetch(filePath).then((response) => response.text());
}

function shuffleIndices(n) {
  return Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
}