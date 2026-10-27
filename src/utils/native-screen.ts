import { registerPlugin } from '@capacitor/core'

type Cutout = { left?: number; right?: number; bottom?: number }

/** Our own native check, in MainActivity's ScreenPlugin. */
const Screen = registerPlugin<{ cutout (): Promise<Cutout> }>('Screen')

/**
 * The app runs full screen. When the camera cutout sits in the middle of the
 * top edge, the header moves up into the strip beside it (body.cutout-centre);
 * other phones keep the header below the cutout.
 */
export const fitToCutout = async () => {
  const { left, right, bottom } = await Screen.cutout().catch((): Cutout => ({}))
  const root = document.documentElement
  // Room for the logo on the left and the header buttons on the right
  const centred = left !== undefined && right !== undefined && !!bottom && left >= 96 && window.innerWidth - right >= 132

  document.body.classList.toggle('cutout-centre', centred)
  root.style.setProperty('--tf-cutout-left', centred ? `${left}px` : '0px')
  root.style.setProperty('--tf-cutout-right', centred ? `${right}px` : '0px')
  root.style.setProperty('--tf-cutout-bottom', centred ? `${bottom}px` : '0px')
}

/** Lays out around the cutout now and whenever the phone turns. */
export const watchCutout = () => {
  let timer: ReturnType<typeof setTimeout> | undefined

  void fitToCutout()
  window.addEventListener('resize', () => {
    clearTimeout(timer)
    timer = setTimeout(() => void fitToCutout(), 200)
  })
}
