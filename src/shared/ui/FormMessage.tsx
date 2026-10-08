/** A message about the whole form (wrong password, locked account, no network), read out when it appears. */
export function FormMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md bg-accent-100 px-4 py-3 text-sm font-semibold text-accent-800"
    >
      {message}
    </p>
  );
}
