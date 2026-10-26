<template>
  <q-select
    use-input
    fill-input
    input-debounce="0"
    v-model="model"
    v-bind="$attrs"
    placeholder="Type to start searching"
    :options="options"
    :loading="loading || creating"
    @filter="search"
    @update:model-value="getOption"
  >
    <template v-slot:selected-item="{ opt }">
      <q-avatar rounded v-if="opt.imageUrl" class="mr-2">
        <q-img fit="cover" :ratio="1 / 1" :src="opt.imageUrl" :error-src="avatarFallback" />
      </q-avatar>
    </template>
    <template v-slot:option="{ opt, itemProps }">
      <q-item
        clickable
        v-ripple
        v-bind="itemProps"
        class="q-mb-sm"
        @click="getOption(opt)"
      >
        <q-item-section avatar>
          <q-avatar rounded>
            <img :src="opt.imageUrl" :error-src="avatarFallback" />
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label>{{ opt.name }}</q-item-label>
          <q-item-label caption lines="1">
            {{ opt.email || `@${opt.username}` }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </template>
    <template v-slot:no-option="{ inputValue }">
      <q-item>
        <q-item-section class="text-grey" v-if="inputValue">
          <q-item-label class="flex items-center justify-around">
            "{{ inputValue }}" not found
            <q-btn
              dense
              no-caps
              icon="lucide-plus"
              color="primary"
              class="flex-none"
              label="Create Now"
              @click="creatingUser(inputValue)"
              v-if="allowCreate"
            />
          </q-item-label>
        </q-item-section>
        <q-item-section class="text-grey" v-else>
          Type a name to search
        </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { avatarFallback } from 'src/utils/imageFallback';
import { useForm } from 'alova/client';
import { alova } from 'src/boot/alova';
import { Artist, BaseOption, ResponseBody, User } from 'src/utils/models';
import { createArtistRequest } from 'src/utils/requests/requests';
import { onBeforeUnmount, ref } from 'vue';

type Option = User & BaseOption;

const emit = defineEmits<{ selected: [value: Option] }>();

const props = withDefaults(
  defineProps<{
    params?: Record<string, string | number>;
    types?: string | string[];
    allowCreate?: boolean;
    list?: Option[] | Artist[] | User[];
  }>(),
  {
    params: () => ({}),
    list: () => [],
  },
);

const model = defineModel<Option | string | number | null>('modelValue', {
  default: null,
});

const endpoint = defineModel('endpoint', {
  type: String,
  default: '/artists',
});

if (model.value && typeof model.value === 'object') {
  model.value.value ??= model.value.id as string;
  model.value.label ??= model.value.name;
} else if (model.value) {
  model.value = {
    value: model.value,
  } as Option;
}

const loading = ref(false);
const options = ref<Option[]>((props.list || []) as Option[]);

const getOption = (e: Option) => {
  emit('selected', {
    ...e,
    id: e.value,
    email: e.email,
    name: e.fullname,
    label: e.fullname,
  });
};

const search = (
  val: string,
  update: (cbFn: () => void) => void /**, abort */,
) => {
  update(async () => {
    if (val === '') {
      // Keep the current options
    } else {
      loading.value = true;
      const { data } = await alova
        .Get<ResponseBody<Option[]>>(endpoint.value, {
          params: {
            ...props.params,
            search: val,
            types: props.types,
          },
        })
        .send();

      if (!data) {
        return;
      }

      loading.value = false;

      options.value = data.map((user) => ({
        ...user,
        label: user.name,
        value: user.id as string,
        email: user.email,
      }));

      return data;
    }
  });
};

onBeforeUnmount(() => {
  model.value = {} as Option;
});

const {
  form,
  send: createUser,
  loading: creating,
} = useForm(createArtistRequest, {
  initialForm: {
    name: '',
  } as Artist,
});

const creatingUser = (name: string) => {
  form.value.name = name;
  createUser().then(({ data }) => {
    const opt = data as Option;
    opt.value = opt.id as string;
    opt.label = opt.fullname || opt.name;
    options.value = [opt];
  });
};
</script>
