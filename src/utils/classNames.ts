export const classNames = (...values: Array<string | false | undefined | null>): string => {
  return values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ');
};
