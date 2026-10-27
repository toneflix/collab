import { defineBoot } from '#q-app';
import { randomUUID } from 'src/utils/helpers';

// Browsers only give crypto.randomUUID to secure pages, so it is missing when
// the app loads over plain http (live reload on a phone). The studio needs it.
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = randomUUID
}

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

Number.prototype.toHertz = function () {
  const parts = this.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return Number(parts.join('.')).toFixed(1);
};

String.prototype.ucwords = function () {
  return this.toLowerCase().replace(/\b[a-z]/g, function (letter) {
    return letter.toUpperCase();
  });
};

String.prototype.ucfirst = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

String.prototype.titleCase = function () {
  return this.toLowerCase()
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/(?:^|\s)\w/g, function (match) {
      return match.toUpperCase();
    });
};

String.prototype.toHertz = function () {
  return Number(this).toHertz();
};

export default defineBoot(async (/* { app, router, ... } */) => {
  // something to do
})
