import { groupBy } from "@/app/utils/groupBy";
import { Mark } from "@/app/generated/app-client";

export const getPageMarks = async (
  page: number
): Promise<
  Record<string, Array<{ name: string; value: string; marked_id: string }>>
> => {
  try {
    const { data: marks, success }: { data: Array<Mark>; success: boolean } =
      await fetch(`/api/quran/pages/${page}/marks`, {
        headers: {
          "Content-Type": "application/json",
        },
      }).then((response) => response.json());

    if (!success) {
      return {};
    }

    return marks.length
      ? groupBy(
          marks.map((mark) => ({
            name: mark.mark_type,
            value: mark.mark_value,
            marked_id: mark.marked_id,
          })),
          "marked_id"
        )
      : {};
  } catch (e) {
    console.error(e);
    return {};
  }
};

