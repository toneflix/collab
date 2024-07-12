<template>
  <q-btn-dropdown
    content-class="t-dropdown"
    :content-style="{ width }"
    :color="color"
    :flat="!!flat || (!hasAlert && flat !== 0)"
    :class="[
      {
        'no-icon': dropdownIcon === 'none',
        'bg-grey-3 text-dark': hasAlert,
      },
    ]"
    :dropdown-icon="noIcon ? 'none' : dropdownIcon"
    :outline="outline && !hasAlert"
    :icon="noIcon || hasAlert ? undefined : icon"
    :label="label"
    :loading="loading"
    v-model="showing"
    v-if="links.some((e) => e.show !== false)"
  >
    <template v-slot:label v-if="hasAlert || tooltip || label">
      <q-tooltip v-if="tooltip">{{ tooltip }}</q-tooltip>
      <q-icon
        name="fa-solid fa-circle"
        class="absolute-top-right text-red"
        size=".7em"
        v-if="!hideAlertIcon && hasAlert"
      />
      <q-icon
        :color="color"
        :name="icon"
        v-if="!noIcon && !!icon && hasAlert"
      />
      <label
        class="q-ma-none q-pa-none"
        :class="{
          'text-white': !outline,
          ['text-' + color]: outline,
        }"
        v-if="label"
      >
        {{ label }}
      </label>
    </template>
    <q-list separator>
      <q-item
        clickable
        :to="link.to"
        :key="link.label"
        :active="link.active"
        :target="link.target"
        :disable="
          link.disable ||
          link.disabled ||
          link.loading ||
          (actions.loading && actions.target === link.target)
        "
        :v-close-popup="
          !link.loading && !(actions.loading && actions.target === link.target)
        "
        @click.prevent="onClick(link)"
        v-for="link in links.filter((e) => e.show !== false)"
      >
        <q-item-section v-if="!link.loading">
          <q-item-label>
            <q-icon
              dense
              class="q-mr-sm"
              :class="link.class"
              :name="link.icon"
              :color="!link.color ? color : link.color"
              v-if="link.icon"
            />
            {{ link.label }}
            <q-tooltip v-if="link.tooltip">{{ link.tooltip }}</q-tooltip>
          </q-item-label>
        </q-item-section>
        <q-item-section
          side
          class="min-w-1"
          v-if="
            link.loading || (actions.loading && actions.target === link.target)
          "
        >
          <q-spinner :color="link.color || color" size="1em" />
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script setup lang="ts">
import { alova } from 'src/boot/alova';
import { notify } from 'src/utils/helpers';
import { ResponseBody, Link } from 'src/utils/models';
import { PropType, ref } from 'vue';
import { useRouter } from 'vue-router';

defineOptions({ name: 'TDropdown' });
const props = defineProps({
  icon: {
    type: String,
    default: 'fa-solid fa-ellipsis-vertical',
  },
  color: {
    type: String,
    default: 'primary',
  },
  dropdownIcon: {
    type: String,
    default: 'arrow_drop_down',
  },
  itemName: {
    type: String,
    default: 'item',
  },
  links: {
    type: Array as PropType<Link[]>,
    default: () => [],
  },
  flat: {
    type: [Boolean, Number],
    default: false,
  },
  outline: {
    type: Boolean,
    default: true,
  },
  width: String,
  label: String,
  noIcon: Boolean,
  tooltip: String,
  loading: Boolean,
  hasAlert: Boolean,
  hideAlertIcon: Boolean,
  withNotifications: Boolean,
});

const showing = ref(false);
const router = useRouter();

const onClick = (link: Link) => {
  if (link.click) {
    link.click(link);
  } else if (link.action) {
    actions.value.delete(link);
  } else if (link.to) {
    router.push(link.to);
  }
};

const actions = ref({
  target: <string | null>null,
  loading: false,
  delete: (link: Link) => {
    return notify({
      msg: `Are you sure you want to delete this ${props.itemName?.toLowerCase()}? This action is not reversible.`,
      alert: true,
      danger: true,
      title: `Delete ${props.itemName}`,
      status: 'warning',
      ok: 'Yes, Delete',
      cancel: true,
    })?.onOk(() => {
      if (!link.target) {
        return;
      }
      actions.value.target = link.target;
      actions.value.loading = true;
      alova
        .Delete<ResponseBody<string[]>>(link.target)
        .send()
        .then((data) => {
          showing.value = false;
          link?.callback && link.callback(data.data);
          if (props.withNotifications) {
            notify(data.message, data.status);
          }
        })
        .finally(() => {
          actions.value.target = null;
          actions.value.loading = false;
        });
    });
  },
});
</script>

<style lang="scss">
.no-icon .q-icon.q-btn-dropdown__arrow {
  display: none;
}
.t-dropdown.q-menu {
  box-shadow:
    0 1px 15px rgb(0 0 0 / 8%),
    0 2px 5px rgb(0 0 0 / 5%);
  border-radius: 15px;
}
</style>
