export const groupBy = <T>(
  arr: Array<T>,
  key: keyof T | ((item: T) => string | number),
) => {
  const grouped: { [key: string]: Array<T> } = {};
  arr.forEach((item) => {
    const keyValue = String(typeof key === "function" ? key(item) : item[key]);
    if (!grouped[keyValue]) {
      grouped[keyValue] = [];
    }
    grouped[keyValue].push(item);
  });
  return grouped;
};

