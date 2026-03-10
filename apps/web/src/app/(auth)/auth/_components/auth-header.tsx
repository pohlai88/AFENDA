interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
}

export function AuthHeader({ title, subtitle, description }: AuthHeaderProps) {
  const text = description ?? subtitle;
  return (
    <header className="flex flex-col form-gap text-center sm:text-left mb-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </header>
  );
}
