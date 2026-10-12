import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tagKeys } from './tagQueries';
import type { TagsGateway } from './tagsGateway';

/** Renaming (possibly merging) and deleting change every list of tags. */
export function useRenameTag(gateway: TagsGateway) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => gateway.rename(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagKeys.all }),
  });
}

export function useDeleteTag(gateway: TagsGateway) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gateway.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tagKeys.all }),
  });
}
