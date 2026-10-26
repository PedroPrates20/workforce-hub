export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <img src="/workforce-mark.svg" alt="Workforce Hub" className={`block shrink-0 ${className}`} style={{ width: 54, height: 32 }} />
  );
}
