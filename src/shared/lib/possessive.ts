/**
 * "Hanna" -> "Hanna's", "Hans" -> "Hans'": a name that ends in s, x or z only takes the
 * apostrophe, as names do in German. (English also allows "Hans's"; the names here are mostly
 * German.)
 */
export function possessive(name: string): string {
  return /[sxzß]$/i.test(name) ? `${name}'` : `${name}'s`;
}
