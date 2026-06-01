import type { StoredChild } from "./schemas";

export interface Filters {
  search?: string;
  gender?: string;
  grade?: string;
}

export function filterStudents(
  children: StoredChild[],
  filters: Filters
): StoredChild[] {
  return children.filter((child) => {
    if (
      filters.search &&
      !child.name.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    if (filters.gender && child.gender !== filters.gender) {
      return false;
    }
    if (filters.grade && child.grade !== filters.grade) {
      return false;
    }
    return true;
  });
}
