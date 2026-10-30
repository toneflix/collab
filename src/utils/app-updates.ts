import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import {
  AppUpdate,
  AppUpdateAvailability,
  AppUpdateResultCode,
  FlexibleUpdateInstallStatus,
  type AppUpdateInfo,
} from '@capawesome/capacitor-app-update'
import { Notify } from 'quasar'

/**
 * Play Store in-app updates for the Android app. Checks on launch and whenever the
 * app comes back to the foreground. High priority releases (4 or 5, set when
 * uploading to Play) take over the screen until installed; other releases
 * download in the background and offer a restart once ready.
 */
export class AppUpdates {
  /** Play update priority from which the update is immediate. */
  static readonly immediatePriority = 4

  /** Version code the person last declined, so the same release is not offered again. */
  static readonly declinedKey = 'app-update.declined'

  static checking = false
  static readyShown = false

  static async start () {
    if (Capacitor.getPlatform() !== 'android') return

    await AppUpdate.addListener('onFlexibleUpdateStateChange', (state) => {
      if (state.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
        AppUpdates.offerRestart()
      }
    })

    await App.addListener('resume', () => void AppUpdates.check())

    await AppUpdates.check()
  }

  static async check () {
    if (AppUpdates.checking) return

    AppUpdates.checking = true

    try {
      const info = await AppUpdate.getAppUpdateInfo()

      if (info.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
        AppUpdates.offerRestart()
      } else if (info.updateAvailability === AppUpdateAvailability.UPDATE_IN_PROGRESS) {
        await AppUpdates.resumeImmediate(info)
      } else if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
        await AppUpdates.update(info)
      }
    } catch {
      // Builds not installed from Play (debug, sideloaded APK) have no update info.
    } finally {
      AppUpdates.checking = false
    }
  }

  static immediate (info: AppUpdateInfo): boolean {
    return (info.updatePriority ?? 0) >= AppUpdates.immediatePriority && !!info.immediateUpdateAllowed
  }

  /** Brings an immediate update left mid-way back on screen. */
  static async resumeImmediate (info: AppUpdateInfo) {
    if (AppUpdates.immediate(info)) {
      await AppUpdate.performImmediateUpdate()
    }
  }

  static async update (info: AppUpdateInfo) {
    if (AppUpdates.immediate(info)) {
      await AppUpdate.performImmediateUpdate()

      return
    }

    if (!info.flexibleUpdateAllowed || AppUpdates.declined() === info.availableVersionCode) return

    const { code } = await AppUpdate.startFlexibleUpdate()

    if (code === AppUpdateResultCode.CANCELED && info.availableVersionCode) {
      AppUpdates.decline(info.availableVersionCode)
    }
  }

  /** Shows once per launch that a downloaded update is waiting for a restart. */
  static offerRestart () {
    if (AppUpdates.readyShown) return

    AppUpdates.readyShown = true

    Notify.create({
      message: 'A new version of Toneflix Music is ready.',
      timeout: 0,
      actions: [
        { label: 'Restart', color: 'primary', noCaps: true, handler: () => void AppUpdate.completeFlexibleUpdate() },
        { label: 'Later', color: 'white', noCaps: true },
      ],
    })
  }

  static declined (): string | null {
    try {
      return localStorage.getItem(AppUpdates.declinedKey)
    } catch {
      return null
    }
  }

  static decline (versionCode: string) {
    try {
      localStorage.setItem(AppUpdates.declinedKey, versionCode)
    } catch {
      // Without storage the release is offered again next time.
    }
  }
}
