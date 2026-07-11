import { Brand } from '../config/branding';
import { resolveBackendAssetUrl } from '../config/env';

type BrandIdentityProps = {
  brand: Brand;
  variant?: 'sidebar' | 'login' | 'receipt';
};

export default function BrandIdentity({ brand, variant = 'sidebar' }: BrandIdentityProps) {
  return (
    <div className={`brand-identity brand-identity-${variant}`}>
      {brand.logoUrl ? (
        <img className="brand-logo" src={resolveBackendAssetUrl(brand.logoUrl)} alt={`${brand.name} logosi`} />
      ) : (
        <div className="brand-mark" aria-hidden="true">{brand.name.charAt(0).toLocaleUpperCase('uz')}</div>
      )}
      <div className="brand-copy">
        <strong className="brand-title">{brand.name}</strong>
        <span className="brand-subtitle">{brand.subtitle}</span>
      </div>
    </div>
  );
}
