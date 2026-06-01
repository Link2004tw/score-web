const gradeNumber = (grade: string): number | null => {
  const match = grade.match(/^(\d+)\s+primary$/);
  return match ? Number(match[1]) : null;
};

export type ChildColor = "red" | "purple" | "blue" | "green";

export function getChildColor(grade: string, gender: string): ChildColor | null {
  const num = gradeNumber(grade);
  if (num === null) return null;
  if (gender === "female") return num <= 3 ? "red" : "purple";
  return num <= 3 ? "blue" : "green";
}

const colorMap: Record<ChildColor, string> = {
  red: "bg-red-500",
  purple: "bg-purple-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
};

export function colorDot(color: ChildColor | null): string {
  if (!color) return "bg-gray-300";
  return colorMap[color];
}
