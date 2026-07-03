<template>
  <div class="color-picker">
    <div
      v-for="color in COLOR_PALETTE"
      :key="color"
      class="color-swatch"
      :class="{ active: modelValue === color }"
      :style="{ backgroundColor: color }"
      @click="select(color)"
    />
  </div>
</template>

<script setup lang="ts">
import { COLOR_PALETTE } from '@/utils/constants'

defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', color: string): void
}>()

function select(color: string) {
  emit('update:modelValue', color)
}
</script>

<style scoped>
.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.15s, border-color 0.15s;
}

.color-swatch:hover {
  transform: scale(1.15);
}

.color-swatch.active {
  border-color: var(--text-primary);
  transform: scale(1.15);
}
</style>
