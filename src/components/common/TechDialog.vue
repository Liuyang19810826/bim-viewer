<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="modelValue" class="dialog-overlay" @click.self="close">
        <div class="dialog-box">
          <div class="dialog-header">
            <h4>{{ title }}</h4>
            <span class="close-btn" @click="close">✕</span>
          </div>
          <div class="dialog-body">
            <slot />
          </div>
          <div class="dialog-footer">
            <slot name="footer">
              <TechButton @click="close">取消</TechButton>
              <TechButton active @click="confirm">确认</TechButton>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import TechButton from './TechButton.vue'

const props = defineProps<{
  modelValue: boolean
  title?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}>()

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  emit('confirm')
  close()
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-box {
  width: 420px;
  max-width: 90%;
  background: var(--bg-secondary);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-panel);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--bg-panel-border);
}

.dialog-header h4 {
  margin: 0;
  font-size: 16px;
  color: var(--accent-cyan);
  letter-spacing: 1px;
}

.close-btn {
  color: var(--text-muted);
  cursor: pointer;
}

.close-btn:hover {
  color: var(--danger);
}

.dialog-body {
  padding: 20px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--bg-panel-border);
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.25s ease;
}

.dialog-enter-active .dialog-box,
.dialog-leave-active .dialog-box {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-box,
.dialog-leave-to .dialog-box {
  opacity: 0;
  transform: scale(0.95);
}
</style>
