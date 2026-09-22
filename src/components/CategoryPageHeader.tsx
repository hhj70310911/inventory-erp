type Props = {
  title: string;
};

export function CategoryPageHeader({ title }: Props) {
  return (
    <header className="mb-8 border-b border-border pb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
    </header>
  );
}
