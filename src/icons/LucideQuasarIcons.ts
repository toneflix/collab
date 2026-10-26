import type { FunctionalComponent, VNode } from 'vue';
import type { IconNode, LucideIcon } from '@lucide/vue';
import type { QuasarIconSet } from 'quasar';
import { lucideIcons, type LucideIconName } from './registry';

type Attrs = Record<string, string | number | undefined>;

/**
 * Lets Quasar draw Lucide icons. Any `icon`/`name` prop written as
 * `lucide-<name>` (or `lucide-<name>:fill` for a filled shape) resolves to the
 * matching icon in the registry, rendered as Quasar SVG paths.
 */
export class LucideQuasarIcons {
  static readonly prefix = 'lucide-';

  private static readonly stroke =
    'fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round';

  private static readonly cache = new Map<string, string>();

  /**
   * Quasar's iconMapFn: returns the SVG for Lucide names and leaves other names alone.
   */
  static mapFn = (name: string): { icon: string } | undefined => {
    if (!name.startsWith(LucideQuasarIcons.prefix)) {
      return undefined;
    }

    const svg = LucideQuasarIcons.svg(name);

    return svg ? { icon: svg } : undefined;
  };

  /**
   * The Quasar SVG string ("path@@style&&path@@style|viewBox") for a Lucide name.
   */
  static svg(name: string): string | undefined {
    const cached = this.cache.get(name);

    if (cached) {
      return cached;
    }

    const [key, variant] = name.slice(this.prefix.length).split(':');
    const icon = lucideIcons[key as LucideIconName];

    if (!icon) {
      if (import.meta.env.DEV)
        console.warn(
          `Unknown Lucide icon "${name}". Add it to src/icons/registry.ts.`,
        );

      return undefined;
    }

    const style =
      variant === 'fill'
        ? this.stroke.replace('fill:none', 'fill:currentColor')
        : this.stroke;
    const paths = this.flatten(this.nodeOf(icon))
      .map(([tag, attrs]) => this.toPath(tag, attrs))
      .filter((d): d is string => !!d)
      .map((d) => `${d}@@${style}`);
    const svg = `${paths.join('&&')}|0 0 24 24`;

    this.cache.set(name, svg);

    return svg;
  }

  /**
   * Quasar's own icons (field clear, dropdown arrows, pagination, ...) drawn with Lucide.
   */
  static iconSet(): QuasarIconSet {
    const i = (name: LucideIconName) => `${this.prefix}${name}`;

    return {
      name: 'lucide',
      type: {
        positive: i('circle-check'),
        negative: i('triangle-alert'),
        info: i('info'),
        warning: i('circle-alert'),
      },
      arrow: {
        up: i('arrow-up'),
        right: i('arrow-right'),
        down: i('arrow-down'),
        left: i('arrow-left'),
        dropdown: i('chevron-down'),
      },
      chevron: { left: i('chevron-left'), right: i('chevron-right') },
      colorPicker: {
        spectrum: i('rainbow'),
        tune: i('sliders-horizontal'),
        palette: i('palette'),
      },
      pullToRefresh: { icon: i('refresh-cw') },
      carousel: {
        left: i('chevron-left'),
        right: i('chevron-right'),
        up: i('chevron-up'),
        down: i('chevron-down'),
        navigationIcon: `${i('circle')}:fill`,
      },
      chip: { remove: i('x'), selected: i('check') },
      datetime: {
        arrowLeft: i('chevron-left'),
        arrowRight: i('chevron-right'),
        now: i('clock'),
        today: i('calendar'),
      },
      editor: {
        bold: i('bold'),
        italic: i('italic'),
        strikethrough: i('strikethrough'),
        underline: i('underline'),
        unorderedList: i('list'),
        orderedList: i('list-ordered'),
        subscript: i('subscript'),
        superscript: i('superscript'),
        hyperlink: i('link'),
        toggleFullscreen: i('maximize-2'),
        quote: i('quote'),
        left: i('text-align-start'),
        center: i('text-align-center'),
        right: i('text-align-end'),
        justify: i('text-align-justify'),
        print: i('printer'),
        outdent: i('list-indent-decrease'),
        indent: i('list-indent-increase'),
        removeFormat: i('remove-formatting'),
        formatting: i('type'),
        fontSize: i('a-large-small'),
        align: i('text-align-start'),
        hr: i('minus'),
        undo: i('undo-2'),
        redo: i('redo-2'),
        heading: i('heading'),
        code: i('code'),
        size: i('a-large-small'),
        font: i('type'),
        viewSource: i('code'),
      },
      expansionItem: { icon: i('chevron-down'), denseIcon: i('chevron-down') },
      fab: { icon: i('plus'), activeIcon: i('x') },
      field: { clear: i('circle-x'), error: i('circle-alert') },
      pagination: {
        first: i('chevrons-left'),
        prev: i('chevron-left'),
        next: i('chevron-right'),
        last: i('chevrons-right'),
      },
      rating: { icon: i('star') },
      stepper: {
        done: i('check'),
        active: i('pencil'),
        error: i('triangle-alert'),
      },
      tabs: {
        left: i('chevron-left'),
        right: i('chevron-right'),
        up: i('chevron-up'),
        down: i('chevron-down'),
      },
      table: {
        arrowUp: i('arrow-up'),
        warning: i('triangle-alert'),
        firstPage: i('chevrons-left'),
        prevPage: i('chevron-left'),
        nextPage: i('chevron-right'),
        lastPage: i('chevrons-right'),
      },
      tree: { icon: i('chevron-right') },
      uploader: {
        done: i('check'),
        clear: i('x'),
        add: i('square-plus'),
        upload: i('cloud-upload'),
        removeQueue: i('list-x'),
        removeUploaded: i('check-check'),
      },
    };
  }

  /**
   * The shape data of a Lucide component, read from the vnode it renders.
   */
  private static nodeOf(icon: LucideIcon): IconNode {
    const vnode = (icon as FunctionalComponent)(
      {},
      { slots: {}, attrs: {}, emit: () => undefined },
    ) as VNode;

    return (vnode.props?.icon as { node: IconNode } | undefined)?.node ?? [];
  }

  private static flatten(node: IconNode): [string, Attrs][] {
    return node.flatMap(([tag, attrs, children]) => [
      [tag, attrs as Attrs] as [string, Attrs],
      ...(children ? this.flatten(children) : []),
    ]);
  }

  /**
   * Turns one SVG element into path data, since Quasar only draws <path>.
   */
  private static toPath(tag: string, a: Attrs): string | undefined {
    const n = (key: string) => Number(a[key] ?? 0);

    switch (tag) {
      case 'path':
        return a.d ? String(a.d) : undefined;
      case 'circle':
        return this.ellipse(n('cx'), n('cy'), n('r'), n('r'));
      case 'ellipse':
        return this.ellipse(n('cx'), n('cy'), n('rx'), n('ry'));
      case 'line':
        return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
      case 'polyline':
      case 'polygon': {
        const points = String(a.points ?? '')
          .trim()
          .split(/[\s,]+/)
          .map(Number);
        const pairs: string[] = [];

        for (let p = 0; p + 1 < points.length; p += 2)
          pairs.push(`${points[p]} ${points[p + 1]}`);

        return `M${pairs.join('L')}${tag === 'polygon' ? 'Z' : ''}`;
      }
      case 'rect':
        return this.rect(
          n('x'),
          n('y'),
          n('width'),
          n('height'),
          Number(a.rx ?? a.ry ?? 0),
        );
      default:
        return undefined;
    }
  }

  private static ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
  ): string {
    return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
  }

  private static rect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): string {
    if (!r) {
      return `M${x} ${y}h${w}v${h}h${-w}Z`;
    }

    return (
      `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}` +
      `a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}` +
      `v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`
    );
  }
}
