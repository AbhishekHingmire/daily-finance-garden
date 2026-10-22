export function EmptyInline({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
