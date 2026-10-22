export function EmptyInline({
  title,
  body,
  message,
}: {
  title?: string;
  body?: string;
  message?: string;
}) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-bold text-foreground">
        {title || message || "No records found"}
      </p>
      {body && <p className="mt-1 text-xs text-muted-foreground">{body}</p>}
    </div>
  );
}
