import { defineBoot } from '#q-app'
import { NativePush } from 'src/utils/native-push'
import { watchCutout } from 'src/utils/native-screen'

// Loaded only in the installed app (Capacitor mode)
export default defineBoot(({ router }) => {
  watchCutout()
  void NativePush.start(router)
})
