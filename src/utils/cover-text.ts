/** Where the title sits on the cover */
export type CoverTextPosition = 'top' | 'middle' | 'bottom';

/** How the title is lettered */
export type CoverTextStyle = 'bold' | 'clean' | 'classic';

export type CoverText = {
  title: string;
  artist?: string | null;
  position: CoverTextPosition;
  style: CoverTextStyle;
};

export const coverTextPositions: { value: CoverTextPosition; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'middle', label: 'Middle' },
  { value: 'bottom', label: 'Bottom' },
];

export const coverTextStyles: { value: CoverTextStyle; label: string }[] = [
  { value: 'bold', label: 'Bold' },
  { value: 'clean', label: 'Clean' },
  { value: 'classic', label: 'Classic' },
];

const SANS = "'Inter Variable', 'Inter', system-ui, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

/** Font, case and spacing for each style, sized from the cover's width */
const fonts: Record<
  CoverTextStyle,
  (size: number) => { title: string; artist: string; upper: boolean; spacing: number }
> = {
  bold: (size) => ({
    title: `800 ${size}px ${SANS}`,
    artist: `600 ${size * 0.42}px ${SANS}`,
    upper: true,
    spacing: size * 0.04,
  }),
  clean: (size) => ({
    title: `600 ${size}px ${SANS}`,
    artist: `400 ${size * 0.45}px ${SANS}`,
    upper: false,
    spacing: 0,
  }),
  classic: (size) => ({
    title: `italic 400 ${size * 1.05}px ${SERIF}`,
    artist: `400 ${size * 0.45}px ${SERIF}`,
    upper: false,
    spacing: 0,
  }),
};

/**
 * Split text into lines that fit the width, at most three, shrinking the
 * font until they do.
 */
const fit = (
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  start: number,
  maxWidth: number,
  spacing: (size: number) => number,
) => {
  let size = start;

  while (size > 12) {
    ctx.font = font(size);
    ctx.letterSpacing = `${spacing(size)}px`;
    const lines: string[] = [];
    let line = '';

    for (const word of text.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);

    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (lines.length <= 3 && widest <= maxWidth) return { size, lines };
    size *= 0.9;
  }

  ctx.font = font(size);
  ctx.letterSpacing = `${spacing(size)}px`;
  return { size, lines: [text] };
};

/** Average brightness (0 to 1) of a band of the image */
const brightness = (ctx: CanvasRenderingContext2D, y: number, height: number) => {
  const { width } = ctx.canvas;
  const data = ctx.getImageData(0, Math.max(0, y), width, Math.max(1, height)).data;
  let sum = 0;

  for (let i = 0; i < data.length; i += 16) {
    sum += (0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!) / 255;
  }

  return sum / (data.length / 16);
};

/**
 * Draw the image with the title (and artist) lettered on it, picking light
 * or dark text from what's behind it and softening that area so it reads.
 */
export const drawCoverText = (
  image: CanvasImageSource & { width: number; height: number },
  text: CoverText,
  canvas: HTMLCanvasElement = document.createElement('canvas'),
) => {
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);

  const title = text.title.trim();
  if (!title) return canvas;

  const { width, height } = canvas;
  const pad = width * 0.07;
  const style = fonts[text.style];
  const shown = style(1).upper ? title.toUpperCase() : title;
  const artist = text.artist?.trim() || '';

  const titleFit = fit(
    ctx,
    shown,
    (s) => style(s).title,
    width * 0.11,
    width - pad * 2,
    (s) => style(s).spacing,
  );
  const look = style(titleFit.size);
  const lineHeight = titleFit.size * 1.1;
  const artistSize = titleFit.size * (artist ? 0.42 : 0);
  const blockHeight = titleFit.lines.length * lineHeight + (artist ? artistSize * 1.8 : 0);

  const top =
    text.position === 'top'
      ? pad
      : text.position === 'middle'
        ? (height - blockHeight) / 2
        : height - pad - blockHeight;

  const light = brightness(ctx, top, blockHeight) > 0.6;
  const ink = light ? '#111111' : '#ffffff';
  const shade = light ? '255, 255, 255' : '0, 0, 0';

  // A soft band behind the text so it reads on busy images.
  const bandTop = Math.max(0, top - pad);
  const bandBottom = Math.min(height, top + blockHeight + pad);
  const gradient = ctx.createLinearGradient(0, bandTop, 0, bandBottom);
  gradient.addColorStop(0, `rgba(${shade}, 0)`);
  gradient.addColorStop(0.5, `rgba(${shade}, 0.45)`);
  gradient.addColorStop(1, `rgba(${shade}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, bandTop, width, bandBottom - bandTop);

  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = `rgba(${shade}, 0.5)`;
  ctx.shadowBlur = titleFit.size * 0.15;

  ctx.font = look.title;
  ctx.letterSpacing = `${look.spacing}px`;
  titleFit.lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, top + i * lineHeight);
  });

  if (artist) {
    ctx.font = look.artist;
    ctx.letterSpacing = `${artistSize * 0.08}px`;
    ctx.globalAlpha = 0.9;
    ctx.fillText(
      artist.toUpperCase(),
      width / 2,
      top + titleFit.lines.length * lineHeight + artistSize * 0.6,
    );
    ctx.globalAlpha = 1;
  }

  return canvas;
};

/** Load an image from a blob so it can be drawn without tainting the canvas */
export const loadImage = (blob: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(image.src);
      resolve(image);
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(blob);
  });
