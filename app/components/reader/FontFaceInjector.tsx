"use client";

type Props = {
  pageIds: number[];
};

export function FontFaceInjector({ pageIds }: Props) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: pageIds
          .map(
            (id) => `
@font-face {
  font-family: 'quran-p${id}';
  src: url('/fonts/v1/ttf/p${id}.ttf') format('truetype');
  font-display: block;
}`
          )
          .join("\n"),
      }}
    />
  );
}
