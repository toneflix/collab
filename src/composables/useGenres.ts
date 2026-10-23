import { ref } from 'vue';
import { Genre } from 'src/utils/models';
import { loadGenresRequest } from 'src/utils/requests/requests';

// Genres rarely change, so they are loaded once and shared by every form.
const genres = ref<Genre[]>([]);
let loading: Promise<Genre[]> | null = null;

/**
 * The list of genres from the API, for genre pickers.
 * `ready` resolves once the list has loaded (to an empty list if the request failed).
 */
export const useGenres = () => {
  if (!loading && typeof window !== 'undefined') {
    loading = loadGenresRequest({ limit: 100 })
      .send()
      .then(({ data }) => (genres.value = data ?? []))
      .catch(() => {
        loading = null;
        return [];
      });
  }

  return { genres, ready: loading ?? Promise.resolve(genres.value) };
};
