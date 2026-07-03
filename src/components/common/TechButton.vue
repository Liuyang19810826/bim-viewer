<template>
  <button
    class="tech-button"
    :class="{ active, danger }"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  active?: boolean
  danger?: boolean
  disabled?: boolean
}>()

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>
