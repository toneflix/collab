<template>
  <q-page>
    <div class="max-w-full p-4 mx-auto md:max-w-2xl lg:max-w-3xl">
      <div class="flex justify-start gap-4 mt-4 mb-2">
        <h4 class="text-xl !flex-none font-semibold md:text-2xl">Collabers</h4>
      </div>
      <q-list class="grid grid-cols-1 md:grid-cols-2">
        <q-banner
          inline-actions
          rounded
          class="col-span-2 p-5 m-3 text-center bg-blue-200 border border-solid text-primary border-primary rounded-xl"
          v-if="!users.length"
        >
          <h3 class="text-3xl font-bold">
            You have not collaborated with any creators yet.
          </h3>
          <template #avatar>
            <q-icon name="info" />
          </template>
        </q-banner>
        <q-item
          clickable
          :to="{ name: 'creator', params: { artist_id: artist.username } }"
          :key="artist.id"
          v-intersection="(e) => onIntersect(e, i === users.length - 1)"
          v-for="(artist, i) in users"
        >
          <q-item-section avatar>
            <q-avatar rounded color="gray-400" text-color="white">
              <q-img no-spinner :src="artist.imageUrl" />
            </q-avatar>
          </q-item-section>

          <q-item-section>{{ artist.name }}</q-item-section>
          <q-item-section side top>
            <TDropdown
              flat
              dense
              rounded
              icon="fas fa-ellipsis"
              dropdown-icon="none"
              color="white"
              :links="[
                {
                  label: 'Block',
                  icon: 'fas fa-user-lock',
                  click: () => flag(artist.id, i),
                  loading: reporting,
                },
              ]"
              @click.stop.prevent
            />
          </q-item-section>
        </q-item>
        <q-item
          class="flex justify-center col-span-2"
          v-if="fetching || loading"
        >
          <q-spinner size="xl" />
        </q-item>
      </q-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { usePagination } from '@alova/scene-vue';
import TDropdown from 'src/components/Utilities/TDropdown.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { PageMeta, User } from 'src/utils/models';
import { requestFlagContent } from 'src/utils/requests/content';
import { loadUsersRequest } from 'src/utils/requests/requests';
import { ref } from 'vue';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);
    const { data: users, meta: usersMeta } = await loadUsersRequest({
      filters: 'collabing',
    }).send();
    boot.pageData.current = { users, usersMeta };
  },
});

const current = useBootstrapStore().pageData.current as {
  users: User[];
  usersMeta: PageMeta;
};

const {
  page,
  data: users,
  loading,
  fetching,
  isLastPage,
} = usePagination(
  (page, limit) => loadUsersRequest({ page, limit, filters: 'collabing' }),
  {
    initialData: {
      data: current.users,
      meta: current.usersMeta,
    },
    immediate: false,
    append: true,
    total: (e) => e.meta?.total,
    data: (e) => e.data,
  },
);

const onIntersect = (
  evt: IntersectionObserverEntry,
  isLast: boolean,
): boolean => {
  if (isLast && !isLastPage.value && evt.isIntersecting) {
    page.value++;
  }
  return true;
};

const reporting = ref(false);
const flag = (id: string | number, index: number) => {
  requestFlagContent(
    { type: 'user', id, label: 'user', action: 'block' },
    (state) => {
      reporting.value = state === 'loading';
    },
  ).then(() => {
    users.value.splice(index, 1);
  });
};
</script>
