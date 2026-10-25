import { alova } from 'src/boot/alova';
import type { ResponseBody } from '../models';

/** One setting of a Faust effect, as its slider is declared in the source */
export interface FaustParam {
  key: string;
  /** The parameter's id in the compiled plugin, like "/tf_hall/decay" */
  address: string;
  min: number;
  max: number;
  step: number;
  init: number;
  /** Shown beside the value, like "Hz" or "%" */
  unit?: string | null;
}

/** A studio effect written in Faust. The browser compiles `source`; the server renders the same code. */
export interface FaustEffect {
  type: `faust-${string}`;
  name: string;
  label: string;
  group: string;
  description: string;
  source: string;
  params: FaustParam[];
}

/** The studio's Faust effects. Empty when the server can't render them. */
export const loadFaustEffectsRequest = () =>
  alova.Get<ResponseBody<FaustEffect[]>>('studio/faust-effects', {
    name: 'faust-effects',
    cacheFor: 10 * 60 * 1000,
  });
