import { alova } from 'src/boot/alova'
import type { ResponseBody, User } from '../models'

export type TwoFactorStatus = {
  enabled: boolean;
  confirmedAt: string | null;
  recoveryCodesLeft: number;
  /** Only right after turning it on or making new ones */
  recoveryCodes?: string[];
}

export type TwoFactorSetup = { secret: string; uri: string }

/** What signing in returns while it waits for a code */
export type TwoFactorChallenge = { twoFactor: true; challenge: string }

export const loadTwoFactorRequest = () =>
  alova.Get<ResponseBody<TwoFactorStatus>>('account/two-factor', { cacheFor: 0 })

/**
 * Make a new secret to add to an authenticator app.
 */
export const startTwoFactorRequest = (password: string) =>
  alova.Post<ResponseBody<TwoFactorSetup>>('account/two-factor', { password })

export const confirmTwoFactorRequest = (code: string) =>
  alova.Post<ResponseBody<TwoFactorStatus>>('account/two-factor/confirm', { code })

export const newRecoveryCodesRequest = (code: string) =>
  alova.Post<ResponseBody<TwoFactorStatus>>('account/two-factor/recovery-codes', { code })

export const disableTwoFactorRequest = (code: string) =>
  alova.Delete<ResponseBody<TwoFactorStatus>>('account/two-factor', { code })

/**
 * Finish signing in with a code from the authenticator app or a recovery code.
 */
export const twoFactorSignInRequest = (challenge: string, code: string) =>
  alova.Post<ResponseBody<User>>('auth/login/two-factor', { challenge, code }, {
    params: { with: 'permissions,roles' },
  })
