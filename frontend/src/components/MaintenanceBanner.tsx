export default function MaintenanceBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="container-wide py-2 text-center text-sm">
        <strong className="font-semibold">Robuttal is no longer maintained.</strong>{' '}
        New debates are no longer being scheduled, but the archive remains available to browse.
        See more of my projects at{' '}
        <a
          href="https://kckdata.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline hover:text-amber-700"
        >
          kckdata.com
        </a>
        .
      </div>
    </div>
  );
}
