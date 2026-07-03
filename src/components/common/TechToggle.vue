<template>
  <label class="tech-toggle">
    <span>{{ label }}</span>
    <div
      class="tech-toggle-switch"
      :class="{ active: modelValue }"
      @click="toggle"
    />
  </label>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
}>()

function toggle() {
  const next = !props.modelValue
  emit('update:modelValue', next)
  emit('change', next)
}
</script>
