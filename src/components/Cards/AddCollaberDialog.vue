<template>
  <slot
    :toggle="
      () => {
        user = {} as Collaber;
        toggle = !toggle;
      }
    "
  >
    <q-btn
      icon="lucide-info"
      v-bind="$attrs"
      @click="toggle = !toggle"
      v-if="!hideBtn"
    >
      <span class="ml-2 text-base">{{ btnLabel }}</span>
    </q-btn>
  </slot>
  <q-dialog transition-show="rotate" transition-hide="rotate" v-model="toggle">
    <q-card flat>
      <q-toolbar>
        <q-toolbar-title>
          <span class="text-bold">{{ project.title }} Project:</span>
          {{
            guestRequest
              ? 'Request Collab'
              : user.id
                ? `Update Collaber (${user.fullname})`
                : 'Invite Collaber'
          }}
        </q-toolbar-title>
        <q-btn flat round dense icon="lucide-x" v-close-popup />
      </q-toolbar>
      <q-separator />
      <q-card-section class="scroll max-h-[60vh]">
        <q-form
          ref="userForm"
          @submit="send"
          class="grid md:gap-y-3 md:grid-cols-2 md:gap-x-6"
        >
          <div class="col-span-2" v-if="!guestRequest">
            <label class="block mb-2 text-xl text-gray-400"> User </label>
            <UserSearchInput
              outlined
              required
              allow-create
              hide-bottom-space
              color="primary"
              class="custom-q-class no-fill"
              endpoint="/users"
              input-class="custom-input-class"
              :params="{ skip: me.id }"
              :disable="!!user.id"
              :error="!!errors.user_id"
              :error-message="errors.user_id"
              v-model="temp"
              @selected="
                (e) => {
                  form.userId = e.id;
                }
              "
            />
          </div>
          <div class="col-span-2">
            <label class="block mb-2 text-xl text-gray-400">
              {{ guestRequest ? 'Preferred' : 'Collaber' }} Role
              <span class="text-center text-red-500">*</span>
            </label>
            <q-select
              outlined
              required
              emit-value
              map-options
              hide-bottom-space
              color="primary"
              class="custom-q-class no-fill"
              input-class="custom-input-class"
              option-value="value"
              option-label="label"
              :label="`${guestRequest ? 'Choose' : 'Assign'} Role`"
              :error="!!errors.role"
              :error-message="errors.role"
              :options="collabRoles"
              v-model="form.role"
            />
          </div>
          <div class="col-span-2" v-if="form.role === 'custom'">
            <label class="block mb-2 text-xl text-gray-400">
              Custom Role
              <span class="text-center text-red-500">*</span>
            </label>
            <q-input
              outlined
              required
              emit-value
              map-options
              hide-bottom-space
              color="primary"
              class="custom-q-class no-fill"
              label="Custom Role"
              input-class="custom-input-class"
              :error="!!errors.custom"
              :error-message="errors.custom"
              :options="collabRoles"
              v-model="form.custom"
            />
          </div>
        </q-form>
      </q-card-section>
      <q-card-actions align="right" class="q-px-md">
        <q-btn
          no-caps
          color="primary"
          class="text-xl rounded-lg"
          :label="
            guestRequest
              ? 'Send Request'
              : user.id
                ? 'Update'
                : 'Send Invitation'
          "
          :loading="saving"
          @click="userForm.submit()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import UserSearchInput from '../Utilities/UserSearchInput.vue';
import {
  BaseOption,
  Collaber,
  Project,
  ResponseBody,
  User,
} from 'src/utils/models';
import { PropType, computed, ref } from 'vue';
import { useForm } from 'alova/client';
import { saveProjectCollaboratorRequest } from 'src/utils/requests/requests';
import { notify } from 'src/utils/helpers';
import { collabRoles } from 'src/utils/presets';
import { useBootstrapStore } from 'src/stores/bootstrap-store';

defineOptions({
  name: 'AddCollaberDialog',
});

const emit = defineEmits<{
  done: [value: boolean];
  saved: [value: Collaber];
  created: [value: Collaber];
}>();

const props = defineProps({
  project: {
    type: Object as PropType<Project>,
    required: true,
  },
  btnLabel: {
    type: String,
    default: 'Add Collaber',
  },
  hideBtn: Boolean,
  guestRequest: Boolean,
});

const me = computed(() => useBootstrapStore().user);
const user = defineModel('user', {
  type: Object as PropType<Collaber>,
  default: () => ({}) as Collaber,
});

const temp = ref<User & BaseOption>({ ...user.value } as unknown as User &
  BaseOption);
const toggle = ref(false);
const errors = computed(
  () => (error.value as unknown as ResponseBody<string>)?.errors || {},
);
const userForm = ref();

const {
  form,
  send,
  error,
  loading: saving,
  // onError,
  onSuccess,
} = useForm(
  (f) =>
    saveProjectCollaboratorRequest(f, props.project, {}, props.guestRequest),
  {
    store: false,
    initialForm: {
      ...user.value,
    } as unknown as Collaber,
  },
);

onSuccess(({ data }) => {
  if (user.value.id) {
    emit('saved', data.data);
  } else {
    emit('created', data.data);
  }
  toggle.value = false;
  emit('done', true);
  notify(data.message, data.status);
});

defineExpose({
  toggle: (artist: Collaber) => {
    artist ||= {} as Collaber;
    form.value = artist;
    user.value = artist;
    temp.value = artist as unknown as User & BaseOption;
    toggle.value = !toggle.value;
  },
});
</script>
