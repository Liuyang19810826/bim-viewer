<template>
  <div class="preset-dropdown" v-click-outside="close">
    <button class="dropdown-trigger" @click="open = !open">
      <span>{{ currentLabel }}</span>
      <span class="arrow" :class="{ open }">▼</span>
    </button>
    <div v-show="open" class="dropdown-menu">
      <div
        v-for="option in options"
        :key="option.key"
        class="dropdown-item"
        :class="{ active: modelValue === option.key }"
        @click="select(option.key)"
      >
        {{ option.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: string
  options: { key: string; name: string }[]
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const open = ref(false)

const currentLabel = computed(() => {
  const found = props.options.find((o) => o.key === props.modelValue)
  return found ? found.name : (props.placeholder || '请选择')
})

function select(key: string) {
  emit('update:modelValue', key)
  open.value = false
}

function close() {
  open.value = false
}

const vClickOutside = {
  mounted(el: HTMLElement, binding: { value: () => void }) {
    const handler = (e: Event) => {
      if (!el.contains(e.target as Node)) {
        binding.value()
      }
    }
    document.addEventListener('click', handler)
    ;(el as any).__clickOutside = handler
  },
  unmounted(el: HTMLElement) {
    const handler = (el as any).__clickOutside
    if (handler) document.removeEventListener('click', handler)
  },
}
</script>

<style scoped>
.preset-dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  outline: none;
}

.dropdown-trigger:hover {
  border-color: var(--accent-cyan);
}

.arrow {
  font-size: 10px;
  color: var(--text-muted);
  transition: transform 0.2s;
}

.arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 120px;
  background: var(--bg-secondary);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-panel);
  z-index: 200;
  overflow: hidden;
}

.dropdown-item {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.dropdown-item:hover {
  background: rgba(0, 212, 255, 0.1);
}

.dropdown-item.active {
  background: rgba(0, 212, 255, 0.2);
  color: var(--accent-cyan);
}
</style>
