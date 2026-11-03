/** Text files end with a newline; an empty body stays empty. */
export function withFinalNewline(text: string): string {
  return text === '' || text.endsWith('\n') ? text : `${text}\n`;
}
