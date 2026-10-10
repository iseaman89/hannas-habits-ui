/** The server's limits (400 `errors.name` / 400 `detail` above them). */
export const MAX_TAG_NAME_LENGTH = 30;
export const MAX_TAGS_PER_DAY = 10;

/** What the server stores: the typed name without the spaces around it. */
export function cleanTagName(typed: string): string {
  return typed.trim();
}

/**
 * Whether two names are the same tag. The server compares ignoring case ("Krank" is "krank"), so
 * the client does as well: typing a name that exists attaches the existing tag instead of asking
 * for a new one. (A difference the server sees and this does not only costs a request - creating
 * is get-or-create there.)
 */
export function sameTagName(a: string, b: string): boolean {
  return cleanTagName(a).toLowerCase() === cleanTagName(b).toLowerCase();
}

/**
 * The tags that fit what is being typed: names that start with it first, then names that contain
 * it. The order inside each group is the list's own (the server sorts it by use), so the tags a
 * habit uses most stay on top. Nothing typed = everything.
 */
export function matchTags<T extends { name: string }>(tags: readonly T[], typed: string): T[] {
  const query = cleanTagName(typed).toLowerCase();
  if (query === '') return [...tags];

  const starting: T[] = [];
  const containing: T[] = [];
  for (const tag of tags) {
    const name = tag.name.toLowerCase();
    if (name.startsWith(query)) starting.push(tag);
    else if (name.includes(query)) containing.push(tag);
  }
  return [...starting, ...containing];
}
