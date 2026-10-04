import { useQuery } from '@tanstack/react-query';
import { auditApi } from './api';
import { auditKeys } from '../../lib/queryKeys';

export function useAuditEntries(params = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditApi.list(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}
