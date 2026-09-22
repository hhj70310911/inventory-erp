import { BrandLogo } from "@/components/BrandLogo";
import { getSiteBrand } from "@/lib/site";

type Props = {
  lineUrl?: string;
};

export function SiteFooter({ lineUrl }: Props) {
  const { name, tagline, logoIcon } = getSiteBrand();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border bg-surface/60">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandLogo src={logoIcon} alt={name} className="h-10 w-auto opacity-90" />
          <p className="text-xs text-muted">{tagline}</p>
          {lineUrl ? (
            <a
              href={lineUrl}
              className="mt-2 text-sm text-ink underline underline-offset-4 hover:text-muted"
              target="_blank"
              rel="noreferrer"
            >
              LINE 聯絡我們
            </a>
          ) : null}
          <p className="mt-4 text-xs text-muted/80">
            © {year} {name}
          </p>
        </div>
      </div>
    </footer>
  );
}
