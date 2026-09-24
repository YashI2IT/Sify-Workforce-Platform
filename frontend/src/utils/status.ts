/**
 * Shared Status Badge Styling Utility
 */

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'SUBMITTED':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'REJECTED':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'DRAFT':
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}
