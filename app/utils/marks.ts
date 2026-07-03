export const getColorMark = (
  marks: Array<{ name: string; value: string }>
) => marks.find((action) => action.name === "color")?.value;
