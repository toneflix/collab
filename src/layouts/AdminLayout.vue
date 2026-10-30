<template>
  <div class="admin-layout">
    <router-view />
  </div>
</template>

<style lang="scss" scoped>
.admin-layout {
  padding: 16px;

  // Pane pages fill the space edge to edge, like /messages
  &:has(> .pane-page) {
    padding: 0;
  }

  // Admin pages are q-pages; inside this layout they only need their content height.
  :deep(.q-page) {
    min-height: 0 !important;
    padding: 0;
  }
}
</style>
