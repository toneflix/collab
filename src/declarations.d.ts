declare module 'waveform-playlist'

declare module 'waveform-playlist/lib/Playout' {
  import { Playout as P } from 'app/models/wave-playlist';
  export default class extends P { }
}

declare module 'waveform-playlist/lib/Track' {
  import { Track as T } from 'app/models/wave-playlist';
  export default class extends T { }
}

declare module 'waveform-playlist/lib/Playlist' {
  import { Playlist as P } from 'app/models/wave-playlist';
  export default class extends P { }
}

// declare global {
//   interface String {
//     slug (length: number): string;
//   }
// }
declare interface String {
  /**
   * Convert a regular string to a url safe slugified string
   */
  slug (separator?: string): string;
}
