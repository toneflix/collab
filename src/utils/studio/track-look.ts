import type { DawEditorElement, DawTrackControlsElement } from '@dawcore/components';
import type { NativePlayoutAdapter } from '@dawcore/transport';
import { css, html, nothing } from 'lit';

/** Colours a stem can have, in the order new stems get them. */
export const STEM_COLORS = ['#03bfff', '#ffb020', '#ff5c8a', '#8f7bff', '#2ed47a', '#ff7a45', '#00d1c1', '#c9cdd4'];

/** A stem's saved colour when it's one of ours, otherwise the colour for its place. */
export const stemColor = (color: unknown, index: number) =>
  typeof color === 'string' && STEM_COLORS.includes(color) ? color : STEM_COLORS[index % STEM_COLORS.length]!;

/** What a track's controls show that the editor doesn't keep. */
interface TrackInfo {
  color: string;
  effects: number;
}

/** The parts of the track controls element its own render uses. */
type Controls = Pick<
  DawTrackControlsElement,
  'trackId' | 'trackName' | 'volume' | 'pan' | 'muted' | 'soloed' | 'reorderable' | 'trackIndex' | 'trackCount' | 'dispatchEvent' | 'getRootNode'
> & {
  _onVolumeInput: (e: Event) => void;
  _onPanInput: (e: Event) => void;
  _onMuteClick: () => void;
  _onSoloClick: () => void;
  _onRemoveClick: () => void;
  _onMoveUp: () => void;
  _onMoveDown: () => void;
  _onGripPointerDown: (e: PointerEvent) => void;
  _dispatchControl: (prop: string, value: number) => void;
};

const looks = new WeakMap<Node, TrackLook>();

const lookOf = (el: Pick<Element, 'getRootNode'>) => looks.get((el.getRootNode() as ShadowRoot).host);

const decibels = (gain: number) => {
  if (gain <= 0.0001) return '-∞ dB';
  const db = 20 * Math.log10(gain);

  return `${db > 0.05 ? '+' : ''}${db.toFixed(1)} dB`;
};

const panLabel = (pan: number) =>
  Math.abs(pan) < 0.005 ? 'C' : `${pan < 0 ? 'L' : 'R'}${Math.round(Math.abs(pan) * 100)}`;

/** The studio's layout for one stem's controls, drawn in place of dawcore's own. */
function render(this: Controls) {
  const look = lookOf(this);
  const info = this.trackId ? look?.info.get(this.trackId) : undefined;
  const color = info?.color ?? STEM_COLORS[this.trackIndex % STEM_COLORS.length]!;
  const selected = !!this.trackId && look?.selected === this.trackId;
  const effects = info?.effects ?? 0;
  const editable = this.reorderable;
  const name = this.trackName || 'Untitled';

  const send = (name: string) =>
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail: { trackId: this.trackId } }));

  // Buttons select their stem on click, so the selected bar opening above can't move them mid-press.
  const onButton = (e: Event) => e.target instanceof Element && !!e.target.closest('button');

  const openEffects = (e: Event) => {
    e.stopPropagation();
    send('tf-track-effects');
  };

  const openColors = (e: Event) => {
    e.stopPropagation();
    send('tf-track-color');
  };

  return html`
    <div
      class="tc ${selected ? 'tc--selected' : ''}"
      style="--tc-color: ${color}"
      @pointerdown=${(e: Event) => !onButton(e) && send('tf-track-select')}
      @click=${(e: Event) => onButton(e) && send('tf-track-select')}
    >
      <div class="tc__main">
        <div class="tc__head">
          <span class="tc__name" title=${name}>${name}</span>
          ${editable
            ? html`<button class="tc__icon tc__remove" title="Remove stem" aria-label="Remove ${name}" @click=${this._onRemoveClick}>
                &times;
              </button>`
            : nothing}
        </div>
        <div class="tc__buttons">
          <button
            class="tc__btn ${this.muted ? 'tc__btn--mute' : ''}"
            title="Mute"
            aria-pressed=${this.muted ? 'true' : 'false'}
            @click=${this._onMuteClick}
          >
            M
          </button>
          <button
            class="tc__btn ${this.soloed ? 'tc__btn--solo' : ''}"
            title="Solo"
            aria-pressed=${this.soloed ? 'true' : 'false'}
            @click=${this._onSoloClick}
          >
            S
          </button>
          ${editable || effects
            ? html`<button
                class="tc__btn tc__btn--fx ${effects ? 'tc__btn--fx-on' : ''}"
                title=${effects ? `${effects} effect${effects === 1 ? '' : 's'}` : 'Add effects'}
                @click=${openEffects}
              >
                FX${effects ? html`<b>${effects}</b>` : nothing}
              </button>`
            : nothing}
          ${editable
            ? html`<button class="tc__btn tc__btn--color" title="Colour" aria-label="Colour of ${name}" @click=${openColors}>
                <i></i>
              </button>`
            : nothing}
        </div>
        <label class="tc__slider tc__vol" title="Volume (double-click for 0 dB)">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            aria-label="Volume of ${name}"
            .value=${String(this.volume)}
            @input=${this._onVolumeInput}
            @dblclick=${() => this._dispatchControl('volume', 1)}
          />
          <span class="tc__value">${decibels(this.volume)}</span>
        </label>
        <label class="tc__slider tc__pan" title="Pan (double-click to centre)">
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            aria-label="Pan of ${name}"
            .value=${String(this.pan)}
            @input=${this._onPanInput}
            @dblclick=${() => this._dispatchControl('pan', 0)}
          />
          <span class="tc__value">${panLabel(this.pan)}</span>
        </label>
      </div>
      <span class="tc__meter" aria-hidden="true"><i></i></span>
      ${editable
        ? html`<div class="tc__order">
            <button class="tc__icon" title="Move up" aria-label="Move ${name} up" ?disabled=${this.trackIndex <= 0} @click=${this._onMoveUp}>
              <svg viewBox="0 0 24 24"><path d="M7 14l5-5 5 5" /></svg>
            </button>
            <button class="tc__icon tc__grip" title="Drag to move" aria-label="Drag ${name} up or down" @pointerdown=${this._onGripPointerDown}>
              <svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="1.4" /><circle cx="15" cy="7" r="1.4" /><circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" /><circle cx="9" cy="17" r="1.4" /><circle cx="15" cy="17" r="1.4" /></svg>
            </button>
            <button
              class="tc__icon"
              title="Move down"
              aria-label="Move ${name} down"
              ?disabled=${this.trackIndex >= this.trackCount - 1}
              @click=${this._onMoveDown}
            >
              <svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" /></svg>
            </button>
          </div>`
        : nothing}
    </div>
  `;
}

const controlStyles = css`
  :host {
    padding: 0;
    color: #e6e8eb;
    font-family: inherit;
    background: #1a1b1e;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .tc {
    display: flex;
    height: 100%;
    box-sizing: border-box;
    border-left: 3px solid var(--tc-color);
    background: linear-gradient(90deg, color-mix(in srgb, var(--tc-color) 10%, transparent), transparent 70%);
  }

  .tc--selected {
    background: linear-gradient(90deg, color-mix(in srgb, var(--tc-color) 24%, transparent), color-mix(in srgb, var(--tc-color) 6%, transparent));
  }

  .tc__main {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    min-width: 0;
    padding: 4px 4px 4px 8px;
  }

  .tc__head {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  .tc__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .tc__buttons {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .tc__btn {
    flex: none;
    height: 18px;
    min-width: 20px;
    padding: 0 5px;
    color: #c9cdd4;
    font: 700 10px/16px inherit;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
  }

  .tc__btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .tc__btn--mute {
    color: #1a1b1e;
    border-color: #ff6b6b;
    background: #ff6b6b;
  }

  .tc__btn--solo {
    color: #1a1b1e;
    border-color: #ffc93c;
    background: #ffc93c;
  }

  .tc__btn--color {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .tc__btn--color i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--tc-color);
  }

  .tc__btn--fx b {
    margin-left: 3px;
  }

  .tc__btn--fx-on {
    color: var(--tc-color);
    border-color: color-mix(in srgb, var(--tc-color) 60%, transparent);
  }

  .tc__meter {
    position: relative;
    flex: none;
    width: 4px;
    margin: 8px 2px;
    overflow: hidden;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.07);
  }

  .tc__meter i {
    position: absolute;
    inset: 0;
    background: linear-gradient(0deg, #2ed47a 0%, #2ed47a 70%, #ffc93c 85%, #ff5c5c 100%);
    clip-path: inset(calc(100% - var(--tc-level, 0) * 100%) 0 0 0);
  }

  .tc__slider {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 14px;
  }

  .tc__value {
    flex: none;
    width: 46px;
    color: #9ea3ab;
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  input[type='range'] {
    flex: 1;
    min-width: 0;
    height: 14px;
    margin: 0;
    background: transparent;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }

  input[type='range']::-webkit-slider-runnable-track {
    height: 3px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.14);
  }

  input[type='range']::-webkit-slider-thumb {
    width: 11px;
    height: 11px;
    margin-top: -4px;
    border-radius: 50%;
    background: var(--tc-color);
    box-shadow: 0 0 0 2px #1a1b1e;
    -webkit-appearance: none;
  }

  input[type='range']::-moz-range-track {
    height: 3px;
    border: none;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.14);
  }

  input[type='range']::-moz-range-thumb {
    width: 11px;
    height: 11px;
    border: none;
    border-radius: 50%;
    background: var(--tc-color);
  }

  .tc__order {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 18px;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
  }

  .tc__icon {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    padding: 0;
    color: #9ea3ab;
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
    border: none;
    background: none;
    opacity: 0.7;
  }

  .tc__icon:hover:not(:disabled) {
    color: #fff;
    opacity: 1;
  }

  .tc__icon:disabled {
    cursor: default;
    opacity: 0.2;
  }

  .tc__icon svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .tc__grip {
    cursor: grab;
    touch-action: none;
  }

  .tc__grip svg {
    fill: currentColor;
    stroke: none;
  }

  .tc__remove {
    flex: none;
    opacity: 0.4;
  }

  .tc__remove:hover {
    color: #ff6b6b !important;
  }

  /* Narrow (phones): name and buttons only. */
  @container (max-width: 150px) {
    .tc__slider,
    .tc__meter {
      display: none;
    }

    .tc__buttons {
      flex-wrap: wrap;
    }
  }

  @container (max-height: 76px) {
    .tc__pan {
      display: none;
    }
  }
`;

/** How the editor's own rows and clips look. */
const editorStyles = `
  .track-row.selected { background: rgba(255, 255, 255, 0.035); }
  .clip-container { border-radius: 6px; }
  .clip-header span { font-size: 11px; font-weight: 600; opacity: 0.95; }
`;

let patched = false;

/**
 * Give dawcore's track controls the studio's layout: a colour per stem, mute,
 * solo, an effects button, a level meter, volume in dB and pan.
 */
export const patchTrackControls = (Element: typeof DawTrackControlsElement) => {
  if (patched) return;
  patched = true;
  Element.prototype.render = render as unknown as DawTrackControlsElement['render'];
  (Element as unknown as { elementStyles: unknown[] }).elementStyles.push(controlStyles);
};

/**
 * The colours, effect counts, selection and level meters of one editor's
 * stems, drawn into its track controls and rows.
 */
export class TrackLook {
  readonly info = new Map<string, TrackInfo>();
  selected: string | null = null;

  private sheet = new CSSStyleSheet();
  private taps = new Map<string, { node: AudioNode; analyser: AnalyserNode; level: number }>();
  private master: { analyser: AnalyserNode; level: number } | null = null;
  private samples = new Float32Array(1024);
  private frame = 0;

  constructor(
    private editor: DawEditorElement,
    private adapter: NativePlayoutAdapter,
    private context: AudioContext,
    /** Called each frame with the master level, 0 to 1 */
    private onMaster?: (level: number) => void,
  ) {
    looks.set(editor, this);
    const root = editor.shadowRoot;
    if (root) root.adoptedStyleSheets = [...root.adoptedStyleSheets, this.sheet];
    this.paint();
  }

  /** Set a track's colour and effect count, and redraw what shows them. */
  set(trackId: string, info: Partial<TrackInfo>) {
    const current = this.info.get(trackId);
    const next = { color: STEM_COLORS[0]!, effects: 0, ...current, ...info };
    this.info.set(trackId, next);
    this.refresh(current?.color !== next.color ? trackId : null);
  }

  forget(trackId: string) {
    this.info.delete(trackId);
    this.taps.get(trackId)?.analyser.disconnect();
    this.taps.delete(trackId);
    this.paint();
  }

  select(trackId: string | null) {
    this.selected = trackId;
    this.refresh(null);
  }

  /** Redraw the controls, and the waveforms of a track whose colour changed. */
  private refresh(recolored: string | null) {
    this.paint();
    this.controls().forEach((el) => el.requestUpdate());
    if (!recolored) return;
    const row = this.editor.shadowRoot?.querySelector(`.track-row[data-track-id="${CSS.escape(recolored)}"]`);
    row?.querySelectorAll('daw-waveform').forEach((wf) => {
      const el = wf as unknown as { peaks: unknown };
      const peaks = el.peaks;
      el.peaks = peaks;
    });
  }

  /** Each stem's waveform and clip header in its colour. */
  private paint() {
    const rules = [...this.info].map(([id, { color }]) => {
      const row = `.track-row[data-track-id="${CSS.escape(id)}"]`;
      return `${row} { --daw-wave-color: ${color}; --daw-clip-header-background: color-mix(in srgb, ${color} 30%, #121212); }
        ${row} .clip-container { background: color-mix(in srgb, ${color} 7%, transparent); }`;
    });
    this.sheet.replaceSync(editorStyles + rules.join('\n'));
  }

  private controls() {
    return [...(this.editor.shadowRoot?.querySelectorAll('daw-track-controls') ?? [])] as DawTrackControlsElement[];
  }

  /** Show levels while playing. */
  start() {
    if (this.frame) return;
    const tick = () => {
      this.measure();
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  /** Stop measuring and let the meters fall to zero. */
  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.taps.forEach((t) => (t.level = 0));
    if (this.master) this.master.level = 0;
    this.controls().forEach((el) => el.style.setProperty('--tc-level', '0'));
    this.onMaster?.(0);
  }

  dispose() {
    this.stop();
    this.taps.forEach((t) => t.analyser.disconnect());
    this.taps.clear();
    this.master?.analyser.disconnect();
  }

  private analyser() {
    const analyser = this.context.createAnalyser();
    analyser.fftSize = 1024;

    return analyser;
  }

  /** The peak of what an analyser hears now, falling back slowly like a meter. */
  private read(analyser: AnalyserNode, previous: number) {
    analyser.getFloatTimeDomainData(this.samples);
    let peak = 0;
    for (const v of this.samples) peak = Math.max(peak, Math.abs(v));
    // Shown on a decibel scale from -48 dB to 0 dB.
    const level = peak > 0 ? Math.max(0, Math.min(1, 1 + (20 * Math.log10(peak)) / 48)) : 0;

    return Math.max(level, previous - 0.03);
  }

  private measure() {
    // Each track's output after its volume, pan and mute. The transport
    // rebuilds these nodes when tracks change, so taps follow the node.
    const nodes = (this.adapter.transport as unknown as { _trackNodes?: Map<string, { _muteNode?: AudioNode }> })
      ._trackNodes;
    for (const el of this.controls()) {
      const id = el.trackId;
      const node = id ? nodes?.get(id)?._muteNode : undefined;
      if (!id || !node) continue;
      let tap = this.taps.get(id);
      if (!tap || tap.node !== node) {
        tap?.analyser.disconnect();
        tap = { node, analyser: this.analyser(), level: 0 };
        node.connect(tap.analyser);
        this.taps.set(id, tap);
      }
      tap.level = this.read(tap.analyser, tap.level);
      el.style.setProperty('--tc-level', tap.level.toFixed(3));
    }

    if (!this.master) {
      this.master = { analyser: this.analyser(), level: 0 };
      this.adapter.transport.masterOutputNode.connect(this.master.analyser);
    }
    this.master.level = this.read(this.master.analyser, this.master.level);
    this.onMaster?.(this.master.level);
  }
}
