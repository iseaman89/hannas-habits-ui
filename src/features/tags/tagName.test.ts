import { describe, expect, it } from 'vitest';
import { cleanTagName, matchTags, sameTagName } from './tagName';

const names = (tags: { name: string }[]) => tags.map((tag) => tag.name);
const tag = (name: string) => ({ name });

describe('cleanTagName', () => {
  it('takes the spaces around the name away and nothing else', () => {
    expect(cleanTagName('  krank  ')).toBe('krank');
    expect(cleanTagName('on  holiday')).toBe('on  holiday');
  });
});

describe('sameTagName', () => {
  it('ignores case and the spaces around the name', () => {
    expect(sameTagName('krank', ' Krank ')).toBe(true);
    expect(sameTagName('Urlaub', 'urlaub')).toBe(true);
  });

  it('tells different names apart', () => {
    expect(sameTagName('krank', 'kranken')).toBe(false);
    expect(sameTagName('', 'krank')).toBe(false);
  });
});

describe('matchTags', () => {
  const tags = ['Urlaub', 'krank', 'Reise', 'Kopfschmerzen', 'krank im Urlaub'].map(tag);

  it('returns everything, in the list’s order, for nothing typed', () => {
    expect(names(matchTags(tags, ''))).toEqual(names(tags));
    expect(names(matchTags(tags, '   '))).toEqual(names(tags));
  });

  it('puts names that start with the input before names that contain it', () => {
    expect(names(matchTags(tags, 'kr'))).toEqual(['krank', 'krank im Urlaub']);
    expect(names(matchTags(tags, 'urlaub'))).toEqual(['Urlaub', 'krank im Urlaub']);
  });

  it('ignores case', () => {
    expect(names(matchTags(tags, 'KOPF'))).toEqual(['Kopfschmerzen']);
  });

  it('keeps the list’s order inside each group', () => {
    const ordered = ['zz a', 'b-a-two', 'a-one', 'a-two'].map(tag);

    // Not alphabetical: the server's order (by use) is what stays.
    expect(names(matchTags(ordered, 'a'))).toEqual(['a-one', 'a-two', 'zz a', 'b-a-two']);
  });

  it('finds nothing for a name that is not there', () => {
    expect(matchTags(tags, 'xyz')).toEqual([]);
  });

  it('does not change the list it is given', () => {
    const copy = [...tags];

    matchTags(tags, 'kr');

    expect(tags).toEqual(copy);
  });
});
