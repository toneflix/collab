import { markRaw, shallowReactive } from 'vue';
import type { Track } from 'src/utils/models';

/** Where a track's menu was opened from, for actions that depend on the list */
export interface TrackMenuContext {
  /** The track's position in the play order, when opened from the queue */
  queuePosition?: number;
  /** The owner's playlist it was opened from, so it can be taken out */
  playlist?: {
    slug: string;
    title: string;
    removed: (track: Track) => void;
  };
}

/**
 * The one track menu on the page. Rows open it for their track; the menu
 * host in the layout shows it as a menu on desktop or a sheet on phones.
 */
export const trackMenu = shallowReactive({
  track: null as Track | null,
  context: {} as TrackMenuContext,
  /** The element the menu hangs from */
  target: null as HTMLElement | null,
  /** Opened by a right click, so the menu shows at the pointer */
  atPointer: false,
  /** Opened by a long press, so it shows as a sheet */
  viaTouch: false,
  /** The event that opened it, for positioning */
  event: null as Event | null,
  /** Goes up on every open, so the host can show the menu again */
  opened: 0,
  /** A dialog the menu asked for, which the host shows */
  dialog: null as { kind: TrackDialog; track: Track } | null,
});

export type TrackDialog = 'credits' | 'report' | 'playlist';

/**
 * Show one of the track menu's dialogs for a track.
 */
export const openTrackDialog = (kind: TrackDialog, track: Track) => {
  trackMenu.dialog = { kind, track };
};

/**
 * Open the menu for a track.
 */
export const openTrackMenu = (
  event: Event,
  track: Track,
  context: TrackMenuContext = {},
  options: { atPointer?: boolean; viaTouch?: boolean } = {},
) => {
  trackMenu.track = track;
  trackMenu.context = context;
  trackMenu.target = markRaw(event.currentTarget as HTMLElement);
  trackMenu.atPointer = !!options.atPointer;
  trackMenu.viaTouch = !!options.viaTouch;
  trackMenu.event = markRaw(event);
  trackMenu.opened++;
};

/**
 * Opens a track's menu from its row: right click with a mouse, long press on
 * touch screens. The click that ends a long press is swallowed so the row
 * doesn't also navigate.
 */
export class TrackMenuTrigger {
  static readonly HOLD_MS = 450;
  /** How far a finger may move before the press counts as a scroll */
  static readonly SLOP = 10;

  protected timer: ReturnType<typeof setTimeout> | null = null;
  protected startX = 0;
  protected startY = 0;
  protected touching = false;
  /** When the last long press opened the menu */
  protected heldAt = 0;

  /** Listeners to bind on a track's row with v-bind */
  listeners(track: Track, context: TrackMenuContext = {}) {
    return {
      onContextmenu: (event: MouseEvent) => this.contextmenu(event, track, context),
      onTouchstart: (event: TouchEvent) => this.touchstart(event, track, context),
      onTouchmove: (event: TouchEvent) => this.touchmove(event),
      onTouchend: (event: TouchEvent) => this.release(event),
      onTouchcancel: () => this.cancel(),
      onClickCapture: (event: MouseEvent) => this.click(event),
    };
  }

  protected contextmenu(event: MouseEvent, track: Track, context: TrackMenuContext) {
    event.preventDefault();

    // Phones send a contextmenu of their own on long press; the hold timer covers it.
    if (this.touching || this.justHeld()) return;

    openTrackMenu(event, track, context, { atPointer: true });
  }

  protected touchstart(event: TouchEvent, track: Track, context: TrackMenuContext) {
    const touch = event.touches[0];
    if (!touch || event.touches.length > 1) return this.cancel();

    this.touching = true;
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.clearTimer();

    const target = event.currentTarget;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.heldAt = Date.now();
      navigator.vibrate?.(10);
      openTrackMenu(
        { currentTarget: target } as unknown as Event,
        track,
        context,
        { viaTouch: true },
      );
    }, TrackMenuTrigger.HOLD_MS);
  }

  protected touchmove(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch || !this.timer) return;

    const moved = Math.hypot(touch.clientX - this.startX, touch.clientY - this.startY);
    if (moved > TrackMenuTrigger.SLOP) this.cancel();
  }

  protected release(event: TouchEvent) {
    this.clearTimer();
    this.touching = false;

    // Stops the tap the browser would send when the finger lifts, which would
    // land on the sheet that just opened under it.
    if (this.justHeld() && event.cancelable) event.preventDefault();
  }

  protected click(event: MouseEvent) {
    if (!this.justHeld()) return;

    event.preventDefault();
    event.stopPropagation();
    this.heldAt = 0;
  }

  protected justHeld() {
    return Date.now() - this.heldAt < 1000;
  }

  protected cancel() {
    this.clearTimer();
    this.touching = false;
  }

  protected clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
