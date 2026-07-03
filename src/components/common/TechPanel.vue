<template>
  <div class="tech-panel">
    <div v-if="title" class="tech-panel-header">
      <span>{{ title }}</span>
      <slot name="extra" />
    </div>
    <div class="tech-panel-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>
