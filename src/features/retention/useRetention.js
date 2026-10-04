import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { retentionApi } from './api';
import { retentionKeys } from '../../lib/queryKeys';

export function useRetentionStatus(campusId) {
  return useQuery({
    queryKey: retentionKeys.status(campusId),
    queryFn: () => retentionApi.status({ campusId }),
  });
}

export function useRetentionReports(params = {}) {
  return useQuery({
    queryKey: retentionKeys.reports(params),
    queryFn: () => retentionApi.reports(params),
    placeholderData: (prev) => prev,
  });
}

export function useRunRetention() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dryRun = true } = {}) => retentionApi.run({ dryRun }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: retentionKeys.all }),
  });
}
