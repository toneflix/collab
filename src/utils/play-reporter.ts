import { alova } from 'src/boot/alova';
import { AuthSession } from 'src/utils/auth-session';
import type { ResponseBody } from 'src/utils/models';

/** Tell the API a signed-in listener played a track for this many seconds. */
export const reportPlayRequest = (trackId: string | number, seconds: number) =>
  alova.Post<ResponseBody<{ trackId: number; seconds: number }>>(`tracks/${trackId}/plays`, { seconds });

/**
 * Counts how long the current track has really been heard (seeks don't
 * count) and reports one play once that passes the paid stream length.
 */
export class PlayReporter {
  private trackId: string | number | null = null;
  private listened = 0;
  private last = 0;
  private sent = false;

  constructor (private threshold: () => number) {}

  /** A new track started; studio previews and guests aren't reported. */
  start (trackId: string | number | null) {
    this.trackId = trackId && AuthSession.current().token ? trackId : null;
    this.listened = 0;
    this.last = 0;
    this.sent = false;
  }

  /** The player's position moved while playing. */
  tick (position: number) {
    const step = position - this.last;
    this.last = position;

    if (step > 0 && step < 3) this.listened += step;
    if (this.sent || !this.trackId || this.listened < this.threshold()) return;

    this.sent = true;
    void reportPlayRequest(this.trackId, Math.round(this.listened))
      .send()
      .catch(() => undefined);
  }
}
