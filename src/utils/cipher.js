export function encodeBinary(text) {
  return [...text.toUpperCase()]
    .map((character) => character.charCodeAt(0).toString(2).padStart(8, "0"))
    .join(" ");
}

export function encodeCaesar(text, shift = 3) {
  return [...text.toUpperCase()]
    .map((character) => {
      const code = character.charCodeAt(0);
      if (code < 65 || code > 90) return character;
      return String.fromCharCode(((code - 65 + shift) % 26) + 65);
    })
    .join("");
}

export function decodeCaesar(text, shift = 3) {
  return encodeCaesar(text, 26 - (shift % 26));
}
