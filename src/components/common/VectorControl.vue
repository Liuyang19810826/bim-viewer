<template>
  <div class="vector-control">
    <span class="vector-label">{{ label }}</span>
    <div class="vector-inputs">
      <input v-model.number="localValue.x" type="number" step="0.1" @change="emitUpdate" />
      <input v-model.number="localValue.y" type="number" step="0.1" @change="emitUpdate" />
      <input v-model.number="localValue.z" type="number" step="0.1" @change="emitUpdate" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  label: string
  value: { x: number; y: number; z: number }
}>()

const emit = defineEmits<{
  (e: 'update', value: { x: number; y: number; z: number }): void
}>()

const localValue = ref({ ...props.value })

watch(() => props.value, (val) => {
  localValue.value = { ...val }
}, { deep: true })

function emitUpdate() {
  emit('update', { ...localValue.value })
}
</script>

<style scoped>
.vector-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}

.vector-label {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.vector-inputs {
  display: flex;
  gap: 6px;
}

.vector-inputs input {
  width: 52px;
  padding: 4px 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 11px;
  text-align: center;
}
</style>
