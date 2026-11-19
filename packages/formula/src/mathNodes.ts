/** The property of a dot notation accessor, e.g. `width` of `$roof.width`. */
export function dotProperty(index: unknown): string {
  return (index as { getObjectProperty: () => string }).getObjectProperty();
}
