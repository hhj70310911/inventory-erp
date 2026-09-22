type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function BrandLogo({ src, alt, className = "" }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
