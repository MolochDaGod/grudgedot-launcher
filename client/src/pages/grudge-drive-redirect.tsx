import RouteRedirect from '@/components/RouteRedirect';

/** Legacy Overdrive URL — unified into Grudge Velocity. */
export default function GrudgeDriveRedirect() {
  return <RouteRedirect to="/drift?tab=overdrive" />;
}