import { boot } from 'quasar/wrappers'
// eslint-disable-next-line @typescript-eslint/no-unused-vars

String.prototype.slug = function (separator: string = '_') {
  const splitCaps = (string: string) => string
    .replace(/([a-z])([A-Z]+)/g, (m: string, s1: string, s2: string) => s1 + ' ' + s2)
    .replace(/([A-Z])([A-Z]+)([^a-zA-Z0-9]*)$/, (m: string, s1: string, s2: string, s3: string) => s1 + s2.toLowerCase() + s3)
    .replace(/([A-Z]+)([A-Z][a-z])/g,
      (m: string, s1: string, s2: string) => s1.toLowerCase() + ' ' + s2);

  return splitCaps(this.toString())
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map((word: string) => word.toLowerCase())
    .join(separator);
}

export default boot(async (/* { app, router, ... } */) => {
  // something to do
})
