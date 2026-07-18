/**
 * Maps a notification to the URL it should navigate to when clicked.
 * Every target page already has an existing way to show one specific record
 * (a detail modal driven by a query param, or a search filter) — this only
 * builds the URL, it does not add any new detail-fetch logic anywhere.
 */
export function getNotificationHref(
  type: string,
  sourceId: string,
  sourceLabel: string | null,
): string {
  switch (type) {
    case "POSTO_BARU": {
      const params = new URLSearchParams({ id: sourceId });
      if (sourceLabel) params.set("noposto", sourceLabel);
      return `/posto?${params.toString()}`;
    }
    case "ARMADA_APPROVED":
    case "ARMADA_REJECTED":
    case "PENGAJUAN_BARU":
      return `/armada/pengajuan?id=${encodeURIComponent(sourceId)}`;
    case "ARMADA_BLOCKED":
    case "ARMADA_UNBLOCKED":
      return sourceLabel ? `/armada?nopol=${encodeURIComponent(sourceLabel)}` : "/armada";
    default:
      return "/";
  }
}
