import { useQuery } from "@tanstack/react-query";

const setPageFont = async (page: number) => {
  return fetch(`/fonts/v1/ttf/p${page}.ttf`)
    .then((resp) => resp.arrayBuffer())
    .then((font) => {
      const fontFace = new FontFace(`v1-p${page}`, font);
      document.fonts.add(fontFace);
      return `v1-p${page}`;
    });
};

export const usePageFont = (page: number) => {
  return useQuery({
    queryKey: ["page-font", page],
    queryFn: () => setPageFont(page),
    staleTime: Infinity,
  });
};

