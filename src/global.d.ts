export { }

declare module 'vue' {
  interface ComponentCustomProperties {
    $hello: (key: string) => string
  }
}
