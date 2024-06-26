import { Emitter } from 'event-emitter';
import { PeakData } from 'webaudio-peaks'
import { VNode } from 'virtual-dom'

export type Fade = 'FadeIn' | 'FadeOut'
export type FadeShape = 'logarithmic' | 'linear' | 'sCurve' | 'exponential'
export type TrackState = 'cursor' | 'fadein' | 'fadeout' | 'select' | 'shift'

export type TrackFade = {
  shape: FadeShape,
  duration: number,
}

export type TrackStates = {
  cursor: boolean,
  fadein: boolean,
  fadeout: boolean,
  select: boolean,
  shift: boolean,
}

export type Annotation = {
  id: string,
  start: number
  end: number,
  lines: string[],
  lang: string | 'en'
}

export type AnnotationListConfig = {
  annotations: Annotation[],
  controls: AnnotationCntrl[],
  editable: boolean,
  linkEndpoints: boolean,
  isContinuousPlay: boolean
}

export type AnnotationCntrl = {
  class: string;
  title: string;
  action (annotation: string, index: number, annotations: Annotation[], opts: Record<string, string>): void;
}

export type Controls = {
  show: boolean,
  width: number,
  widgets?: {
    muteOrSolo: boolean,
    volume: boolean,
    stereoPan: boolean,
    collapse: boolean,
    remove: boolean
  }
}

export type TrackData = {
  height: number,
  resolution: number,
  sampleRate: number,
  controls: Controls,
  isActive: boolean,
  timeSelection: {
    start: number,
    end: number,
  },
  playlistLength: number,
  playbackSeconds: number,
  colors: Colors,
  barWidth: number,
  barGap: number,
  shouldPlay: boolean,
  soloed: boolean,
  muted: boolean,
  collapsed: boolean,
}

type NoEffects = (
  n1: { connect: (p1: (() => void) | Record<string, (() => void) | string | boolean>) => void },
  n2: (() => void) | Record<string, (() => void) | string | boolean>
) => void

type Colors = {
  waveOutlineColor: string,
  timeColor: string,
  fadeColor: string,
}

type TrackInfo = {
  src: string | File,
  start: number,
  end: number,
  name: string,
  customClass: string,
  stereoPan: number,
  cuein: number,
  cueout: number,
  gain: GainNode,
  effects: NoEffects,
}

export class Track {
  constructor();
  src: string | File;
  name: string;
  customClass?: string;
  waveOutlineColor?: string;
  gain: GainNode;
  fades: Record<string, TrackFade>;
  peakData: {
    type: 'WebAudio',
    mono: boolean,
  };
  cueIn: number;
  muted: boolean;
  soloed: boolean;
  cueOut: number;
  duration: number;
  startTime: number;
  endTime: number;
  stereoPan: number;
  buffer?: AudioBuffer;
  enabledStates: TrackStates;
  effectsGraph: NoEffects;
  setEventEmitter (ee: Emitter): void;
  setName (name: string): void;
  setCustomClass (className: string): void;
  setWaveOutlineColor (color: string): void;
  setCues (cueIn: number, cueOut: number): void;
  trim (start: number, end: number): void;
  setStartTime (start: number): void;
  setPlayout (playout: Playout): void;
  setOfflinePlayout (playout: Playout): void;
  setEnabledStates (enabledStates: TrackStates): void;
  setFadeIn (duration: number, shape: FadeShape): void;
  setFadesetFadeOutIn (duration: number, shape: FadeShape): void;
  saveFade (type: Fade, shape: FadeShape, start: number, end: number): string;
  removeFade (id: string): void;
  setBuffer (buffer: ArrayBuffer): void;
  setPeakData (data: PeakData): void;
  calculatePeaks (samplesPerPixel: number, sampleRate: number): void;
  setPeaks (peaks: PeakData): void;
  setState (state: TrackState): void;
  getStartTime (): number;
  getEndTime (): number;
  getDuration (): number;
  isPlaying (): boolean;
  setShouldPlay (bool: boolean): void;
  setGainLevel (level: number): void;
  setMasterGainLevel (level: number): void;
  setStereoPanValue (value: number): void;
  setEffects (effectsGraph: NoEffects): void;
  schedulePlay (
    now: number,
    startTime: number,
    endTime: number,
    config: Record<string, string | number | boolean>
  ): Promise<void>;
  scheduleStop (when: number): void;
  renderOverlay (data: Record<string, string>): VNode;
  renderControls (data: Record<string, string>): VNode;
  render (data: Record<string, string>): VNode;
  getTrackDetails (): TrackInfo;
}

export class Playout {
  constructor(
    ac: AudioContext | OfflineAudioContext,
    buffer?: ArrayBuffer | AudioBuffer,
    masterGain?: GainNode
  );
  ac: AudioContext;
  gain: GainNode;
  buffer: ArrayBuffer;
  masterGain: GainNode;
  destination: AudioDestinationNode;
  effectsGraph: NoEffects;
  masterEffectsGraph: NoEffects;
  applyFade (type: Fade, start: number, duration: number, shape: FadeShape): void;
  applyFadeIn (start: number, duration: number, shape: FadeShape): void;
  applyFadeOut (start: number, duration: number, shape: FadeShape): void;
  isPlaying (): boolean;
  getDuration (): number;
  setAudioContext (ac: AudioContext): void;
  createStereoPanner (): void;
  setUpSource (): Promise<void>;
  setVolumeGainLevel (level: number): void
  setShouldPlay (bool: boolean): void;
  setMasterGainLevel (level: number): void;
  setStereoPanValue (pan: number): void;
  setEffects (p1: NoEffects): void;
  setMasterEffects (p1: NoEffects): void;
  play (when: number, start: number, duration: number): void;
  stop (when: number): void;
}

export class DragInteraction {
  constructor(playlist: Playlist, data: { direction: 'left' | 'right' | 'up' | 'down', index: number });
  playlist: Playlist;
  data: { direction: 'left' | 'right' | 'up' | 'down', index: number };
  active: boolean;
  emitDrag (x: number): void;
  complete (): void;
  dragstart (e: DragEvent): void;
  dragend (e: Event): void;
  getClass (): string
  getEvents (): ('dragstart' | 'dragend')[]
}

export class AnnotationList {
  constructor(
    playlist: Playlist,
    annotations: Annotation[],
    controls: AnnotationCntrl[],
    editable: boolean,
    linkEndpoints: boolean,
    isContinuousPlay: boolean,
    marginLeft: number
  );
  playlist: Playlist;
  marginLeft: number;
  resizeHandlers: [];
  editable: boolean;
  annotations: Annotation[];
  controls: AnnotationCntrl[];
  length: number;
  setupInteractions (): void;
  setupEE (ee: Emitter): Emitter
  export (): void;
  renderResizeLeft (i: number): VNode;
  renderResizeRight (i: number): VNode;
  renderControls (note: string, index: number): VNode[];
  render (): VNode;
}

export class Playlist {
  constructor();
  ee: Emitter;
  tracks: Track[];
  colors: Colors;
  controls: Controls;
  soloedTracks: Track[];
  mutedTracks: Track[];
  exportWorker: {
    postMessage (config: {
      command: 'init' | 'exportWAV' | 'record' | 'clear',
      config?: Record<string, string | number | boolean>,
      buffer?: Float32Array[],
      type?: string,
    }): void,
    onmessage: (e: { data: AudioBuffer }) => void;
  };
  collapsedTracks: Track[];
  playoutPromises: Promise<Playout>[];
  cursor: number;
  effectsGraph: NoEffects;
  playbackSeconds: number;
  duration: number;
  scrollLeft: number;
  scrollTimer?: number;
  showTimescale: boolean;
  isScrolling: boolean;
  isRendering: boolean;
  linkEndpoints: boolean;
  fadeType: FadeShape;
  masterGain: GainNode;
  annotations: Annotation[];
  durationFormat: string;
  isAutomaticScroll: boolean;
  resetDrawTimer?: boolean;
  samplesPerPixel: number;
  mono: boolean;
  waveHeight: number;
  container: HTMLElement;
  state: TrackState;
  timescale: boolean;
  seekStyle: 'line' | 'fill';
  zoomIndex: number;
  zoomLevels: number[];
  initExporter (): void;
  initRecorder (stream: MediaStream): void;
  setShowTimeScale (show: boolean): void;
  setMono (mono: boolean): void;
  setExclSolo (exclSolo: boolean): void;
  setSeekStyle (style: string): void;
  getSeekStyle (): string;
  setSampleRate (sampleRate: number): void;
  setSamplesPerPixel (samplesPerPixel: number): void;
  setAudioContext (ac: AudioContext): void;
  getAudioContext (): AudioContext;
  setControlOptions (controlOptions: Controls): void;
  setWaveHeight (height: number): void;
  setCollapsedWaveHeight (height: number): void;
  setColors (colors: Colors): void;
  setBarWidth (width: number): void;
  setBarGap (width: number): void;
  setAnnotations (config: AnnotationListConfig): void;
  setEffects (effectsGraph: NoEffects): void
  setEventEmitter (ee: Emitter): void
  getEventEmitter (): Emitter;
  setUpEventEmitter (): void;
  load (trackList: Track[]): Promise<void>;
  setActiveTrack (track: Track): void;
  getActiveTrack (): Track
  isSegmentSelection (): boolean;
  setTimeSelection (start: number, end: number): void;
  startOfflineRender (type: 'buffer' | 'wav'): Promise<void>;
  getTimeSelection (): { start: number, end: number }
  setState (state: TrackState): void;
  getState (): TrackState;
  setZoomIndex (index: number): void;
  setZoomLevels (levels: number[]): void;
  setZoom (zoom: number): void;
  muteTrack (track: Track): void
  soloTrack (track: Track): void
  collapseTrack (track: Track, opts: TrackData): void;
  removeTrack (track: Track): void;
  adjustTrackPlayout (): void;
  adjustDuration (): void;
  shouldTrackPlay (track: Track): boolean;
  isPlaying (): boolean;
  getCurrentTime (): number;
  getElapsedTime (): number;
  setMasterGain (gain: GainNode): void;
  restartPlayFrom (start: number, end: number): Promise<Playout[]>
  play (startTime: number, endTime: number): Promise<Playout[]>
  pause (): Promise<Playout[]>
  stop (): Promise<Playout[]>
  playbackReset (): Promise<Playout[]>
  rewind (): void;
  fastForward (): Promise<Playout[]>
  clear (): void;
  record (): void;
  startAnimation (startTime: number): void;
  stopAnimation (): void;
  seek (start: number, end: number, track: Track): void;
  updateEditor (cursor: number): void;
  drawRequest (): void;
  draw (newTree: VNode): void;
  getTrackData (data: TrackData): TrackData
  isActiveTrack (track: Track): boolean;
  renderAnnotations (): VNode;
  renderTimeScale (): VNode;
  renderTrackSection (): VNode;
  render (): VNode;
  getInfo (): { tracks: Track[], effect: NoEffects };
}
