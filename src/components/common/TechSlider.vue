<template>
  <div class="tech-slider">
    <div class="tech-slider-label">
      <span>{{ label }}</span>
      <span>{{ displayValue }}</span>
    </div>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  modelValue: number
  min: number
  max: number
  step?: number
  displayValue?: string | number
}>()

defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()
</script>
