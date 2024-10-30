export const groupBy = <T>(arr: Array<T>, key: keyof T) => {
  const grouped: { [key: string]: Array<T> } = {};
  arr.forEach((item) => {
    const keyValue = item[key] as string;
    if (!grouped[keyValue]) {
      grouped[keyValue] = [];
    }
    grouped[keyValue].push(item);
  });
  return grouped;
};

