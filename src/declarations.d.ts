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
