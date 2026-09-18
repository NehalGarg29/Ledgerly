export function getInitials(email: string): string {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

export function getRoleColor(role: string): string {
  switch (role) {
    case "admin":
      return "bg-emerald-600";
    case "analyst":
      return "bg-blue-600";
    default:
      return "bg-zinc-500";
  }
}
