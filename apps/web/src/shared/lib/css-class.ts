export function cssClass(
  classes: Record<string, string | undefined>,
  name: string,
): string {
  const value = classes[name];
  if (value === undefined) {
    throw new Error(`Missing CSS module class: ${name}`);
  }
  return value;
}

export function cssClasses(
  classes: Record<string, string | undefined>,
  ...names: string[]
): string {
  return names.map((name) => cssClass(classes, name)).join(" ");
}
