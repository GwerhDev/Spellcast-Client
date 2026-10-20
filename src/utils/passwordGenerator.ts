// A strong random password: letters, digits and a few symbols, leaving out the characters
// easily mistaken for one another (0/O, 1/l/I), since it may be read and typed by hand.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_.!?#';

export const generatePassword = (length = 20): string => {
  // Rejection sampling: only bytes below a multiple of the alphabet's size, so every
  // character is equally likely.
  const limit = 256 - (256 % ALPHABET.length);
  let out = '';
  while (out.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < limit && out.length < length) out += ALPHABET[byte % ALPHABET.length];
    }
  }
  return out;
};
