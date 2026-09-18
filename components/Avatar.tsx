import { getInitials, getRoleColor } from "../lib/avatar";

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-14 w-14 text-lg",
};

export default function Avatar({
  email,
  role,
  size = "md",
}: {
  email: string;
  role: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${getRoleColor(role)} ${SIZE_CLASSES[size]}`}
      title={`${email} (${role})`}
    >
      {getInitials(email)}
    </span>
  );
}
