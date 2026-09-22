import type { CategoryNavItem } from "@/lib/categories";

type Props = {
  categories: CategoryNavItem[];
  defaultCategoryId?: string | null;
  inputClass: string;
};

export function CategorySelect({ categories, defaultCategoryId, inputClass }: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      <span>分類（選，未分類僅顯示於首頁）</span>
      <select name="categoryId" defaultValue={defaultCategoryId ?? ""} className={inputClass}>
        <option value="">未分類</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
