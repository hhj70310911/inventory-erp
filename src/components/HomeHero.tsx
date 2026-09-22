import { BrandLogo } from "@/components/BrandLogo";
import { getSiteBrand } from "@/lib/site";

export function HomeHero() {
  const { name, tagline, slogan, logoFull } = getSiteBrand();

  return (
    <section className="card-surface mb-10 px-6 py-10 text-center md:px-12 md:py-14">
      <BrandLogo
        src={logoFull}
        alt={name}
        className="mx-auto h-24 w-auto md:h-28"
      />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink md:text-3xl">
        {slogan}
      </h1>
      <p className="mt-3 text-sm text-muted">{tagline}</p>
    </section>
  );
}
