#!/usr/bin/env node
// Writes Google Play "What's new" text from the pull requests and direct commits
// made since the last Android release commit.
//
// Usage: node .github/scripts/release-notes.mjs <out-dir> [--locale en-US] [--skip-prereleases]

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RELEASE_SUBJECT = '^chore: Android release ';

class Git {
  run(...args) {
    return execFileSync('git', args, {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  }

  lines(...args) {
    const out = this.run(...args);

    return out ? out.split('\n') : [];
  }

  /**
   * The newest release commit on any branch. Skipping pre-releases passes over
   * versions with a suffix, such as 1.1.1-beta or 1.1.1-test.
   */
  lastRelease(skipPrereleases) {
    const commits = this.lines(
      'log',
      '--all',
      '--date-order',
      '--extended-regexp',
      `--grep=${RELEASE_SUBJECT}`,
      '--format=%H %s',
    );
    const release = commits.find(
      (line) => !skipPrereleases || !/\d-[0-9A-Za-z.]+ \(build/.test(line),
    );

    return release?.split(' ')[0] ?? null;
  }

  commits(base, limit) {
    const range = base ? [`${base}..HEAD`] : ['HEAD', `--max-count=${limit}`];
    const records = this.run('log', ...range, '--format=%H%x1f%P%x1f%B%x1e')
      .split('\x1e')
      .map((record) => record.trim())
      .filter(Boolean);

    return records.map((record) => {
      const [hash, parents, message] = record.split('\x1f');

      return {
        hash,
        parents: parents.split(' ').filter(Boolean),
        message: message.trim(),
      };
    });
  }

  /**
   * Files a change touched: a pull request against the branch it merged into,
   * any other commit against its parent.
   */
  files(commit) {
    if (commit.parents.length > 1) {
      return this.lines('diff', '--name-only', commit.parents[0], commit.hash);
    }

    return this.lines(
      'diff-tree',
      '--root',
      '--no-commit-id',
      '--name-only',
      '-r',
      commit.hash,
    );
  }

  branchCommits(merge) {
    return this.lines('rev-list', `${merge.parents[0]}..${merge.parents[1]}`);
  }
}

class Change {
  static TYPES = { feat: 'new', perf: 'improved', fix: 'fixed' };

  /**
   * Reads a conventional commit title such as "feat(studio): add loops".
   * A "Release note:" line in the message replaces the title, and
   * "Release note: none" leaves the change out.
   */
  static parse(title, message = '') {
    const note = message.match(/^release[ -]note:\s*(.+)$/im)?.[1]?.trim();
    if (note && /^(none|skip|-)$/i.test(note)) return null;

    const match = title.match(/^(\w+)(?:\(([^)]*)\))?!?:\s*(.+)$/);
    if (!match) return null;

    const section = Change.TYPES[match[1].toLowerCase()];
    if (!section) return null;

    return new Change(section, note ?? match[3], match[2] ?? '', match[3]);
  }

  constructor(section, text, scope = '', title = text) {
    this.section = section;
    this.text = Change.tidy(text);
    this.scope = scope.toLowerCase();
    this.title = title;
  }

  /**
   * Admin changes: an admin scope, a title that mentions admins, or files that
   * all sit under admin pages, components or requests. A "Release note:" line
   * keeps a change whose title mentions admins.
   */
  isAdmin(files) {
    if (this.scope === 'admin') return true;
    if (
      this.text === Change.tidy(this.title) &&
      /\badmins?\b/i.test(this.title)
    ) {
      return true;
    }

    return files.length > 0 && files.every((file) => /admin/i.test(file));
  }

  static tidy(text) {
    const clean = text
      .replace(/\s*\(#\d+\)\s*$/, '')
      .replace(/\s*\[skip ci\]\s*/gi, '')
      .replace(/[.\s]+$/, '');

    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
}

class ReleaseNotes {
  static LIMIT = 500;
  static SECTIONS = { new: "What's new", improved: 'Improved', fixed: 'Fixed' };
  static FALLBACK = 'Bug fixes and performance improvements.';
  static MORE = '• And more fixes and improvements';

  constructor(git) {
    this.git = git;
  }

  /**
   * Pull requests are read from their merge commits ("Merge pull request #12"),
   * whose message body is the PR title. Commits inside a PR are skipped, so
   * the rest are direct commits or squash merges.
   */
  changes(base) {
    const commits = this.git.commits(base, 50);
    const merges = commits.filter((commit) => commit.parents.length > 1);
    const inPulls = new Set(
      merges
        .filter((merge) => /^Merge pull request #\d+/.test(merge.message))
        .flatMap((merge) => this.git.branchCommits(merge)),
    );

    return commits
      .filter((commit) => !inPulls.has(commit.hash))
      .map((commit) => {
        const [subject, ...body] = commit.message.split('\n');

        if (commit.parents.length > 1) {
          if (!/^Merge pull request #\d+/.test(subject)) return null;

          const title = body.find((line) => line.trim())?.trim() ?? '';

          return this.userFacing(Change.parse(title, body.join('\n')), commit);
        }

        return this.userFacing(Change.parse(subject, commit.message), commit);
      })
      .filter(Boolean)
      .reverse();
  }

  userFacing(change, commit) {
    if (!change || change.isAdmin(this.git.files(commit))) return null;

    return change;
  }

  /**
   * Builds the text section by section and stops before Play's 500 character
   * limit, closing with a line that says there is more.
   */
  render(changes) {
    const seen = new Set();
    const unique = changes.filter((change) => {
      const key = change.text.toLowerCase();
      if (seen.has(key)) return false;

      seen.add(key);

      return true;
    });

    if (!unique.length) return ReleaseNotes.FALLBACK;

    const length = (text) => [...text].length;
    const budget = ReleaseNotes.LIMIT - length(`\n\n${ReleaseNotes.MORE}`);
    let text = '';
    let left = unique.length;

    for (const [section, heading] of Object.entries(ReleaseNotes.SECTIONS)) {
      const items = unique.filter((change) => change.section === section);
      if (!items.length) continue;

      let block = `${text ? '\n\n' : ''}${heading}`;

      for (const item of items) {
        const line = `\n• ${item.text}`;
        if (length(text + block + line) > budget) break;

        block += line;
        left -= 1;
      }

      if (block.includes('\n•')) text += block;
    }

    if (left > 0) text += `${text ? '\n\n' : ''}${ReleaseNotes.MORE}`;

    return text || ReleaseNotes.FALLBACK;
  }

  write(dir, locale, skipPrereleases) {
    const base = this.git.lastRelease(skipPrereleases);
    const text = this.render(this.changes(base));

    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `whatsnew-${locale}`), `${text}\n`);

    return { base, text };
  }
}

const args = process.argv.slice(2);
const dir = args[0] && !args[0].startsWith('--') ? args[0] : 'whatsnew';
const localeAt = args.indexOf('--locale');
const locale = localeAt >= 0 ? args[localeAt + 1] : 'en-US';
const { base, text } = new ReleaseNotes(new Git()).write(
  dir,
  locale,
  args.includes('--skip-prereleases'),
);

console.log(`Changes since ${base ?? 'the last 50 commits'}:\n\n${text}`);
