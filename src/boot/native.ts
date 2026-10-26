import { defineBoot } from '#q-app'
import { NativePush } from 'src/utils/native-push'

// Loaded only in the installed app (Capacitor mode)
export default defineBoot(({ router }) => {
  void NativePush.start(router)
})
