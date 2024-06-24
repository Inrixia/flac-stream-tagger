/**
 * Map tag name to single value (`string`) or multiple values (`string[]`). The tag name does not need to be uppercase.
 * @example
 * ```ts
 * const tagMap: FlacTagMap = {
 *   // single value
 *   title: 'song title',
 *   // multiple values
 *   artist: ['artist A', 'artist B'],
 *   album: 'album name',
 * }
 * ```
 */

export type FlacTagMap = Record<string, string[] | string>;
export const createFlacTagMap = (): FlacTagMap => {
  return new Proxy(
    {},
    {
      get(target, p, receiver) {
        return Reflect.get(target, p.toString().toUpperCase(), receiver);
      },
      set(target, p, newValue, receiver) {
        return Reflect.set(target, p.toString().toUpperCase(), newValue, receiver);
      },
    }
  );
};
