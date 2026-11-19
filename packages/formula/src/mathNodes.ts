/** The property of a dot notation accessor, e.g. `field` of `$group.field`. */
export function dotProperty(index: unknown): string {
  return (index as { getObjectProperty: () => string }).getObjectProperty();
}
