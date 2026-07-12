/**
 * ArsenalPage.tsx — thin redirect shim to the canonical WCS /arsenal.
 *
 * The original in-app arsenal is preserved at `ArsenalPage.legacy.tsx`.
 */
import WcsRedirect from '@/components/WcsRedirect';

export default function ArsenalPage() {
  return <WcsRedirect to="/arsenal" returnPath="/warlord-suite" label="Open Arsenal" />;
}
