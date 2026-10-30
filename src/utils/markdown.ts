import { Marked, type Tokens } from 'marked';

/**
 * Renders chat markdown to HTML. Raw HTML is shown as text and links or
 * images only keep http(s) and mailto addresses, so the output is safe for v-html.
 */
export class SafeMarkdown {
  private static readonly SAFE_URL = /^(https?:|mailto:|\/(?!\/)|#)/i;

  private readonly marked: Marked;

  constructor() {
    this.marked = new Marked({ gfm: true, breaks: true });
    this.marked.use({
      renderer: {
        html: ({ text }: Tokens.HTML | Tokens.Tag) => SafeMarkdown.escape(text),
        link(token: Tokens.Link) {
          return SafeMarkdown.isSafe(token.href) ? false : this.parser.parseInline(token.tokens);
        },
        image: ({ href, text }: Tokens.Image) => (SafeMarkdown.isSafe(href) ? false : SafeMarkdown.escape(text)),
      },
    });
  }

  render(text: string): string {
    return this.marked.parse(text ?? '', { async: false });
  }

  static isSafe(url: string): boolean {
    return SafeMarkdown.SAFE_URL.test(url.trim());
  }

  static escape(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

export const markdown = new SafeMarkdown();
