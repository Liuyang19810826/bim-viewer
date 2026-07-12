<template>
  <div class="scene-tree-item">
    <div
      class="tree-row"
      :class="{ selected: isSelected, hidden: !node.visible }"
      :style="{ paddingLeft: `${props.depth * 14 + 6}px` }"
      @click="selectNode"
      @dblclick="focusNode"
    >
      <span
        v-if="node.children.length > 0"
        class="expand-arrow"
        :class="{ expanded: expanded }"
        @click.stop="toggleExpand"
      >▶</span>
      <span v-else class="expand-placeholder" />
      <input
        type="checkbox"
        :checked="node.visible"
        @click.stop
        @change="toggleVisibility"
      />
      <span class="node-icon">{{ typeIcon }}</span>
      <span class="node-name" :title="node.name">{{ node.name }}</span>
      <span class="node-type">{{ node.type }}</span>
    </div>
    <div v-show="expanded" class="tree-children">
      <SceneTreeItem
        v-for="child in node.children"
        :key="child.uuid"
        :node="child"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch, type Ref } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from '@/composables/useBIMViewer'
import type { SceneTreeNode } from '@/types'

const props = withDefaults(
  defineProps<{
    node: SceneTreeNode
    depth?: number
  }>(),
  { depth: 0 }
)

const viewerStore = useViewerStore()
const expanded = ref(true)
const expandSignal = inject<Ref<number>>('sceneTreeExpandSignal')
let previousSignal = expandSignal?.value ?? 0

watch(
  () => expandSignal?.value,
  (value) => {
    if (value === undefined) return
    if (value > previousSignal) expanded.value = true
    else if (value < previousSignal) expanded.value = false
    previousSignal = value
  }
)

const isSelected = computed(() => viewerStore.selectedNodeUuid === props.node.uuid)

const typeIcon = computed(() => {
  switch (props.node.type) {
    case 'Scene':
      return '☰'
    case 'Group':
      return '⊞'
    case 'Mesh':
      return '▧'
    case 'Light':
      return '☀'
    case 'Camera':
      return '◉'
    case 'Bone':
      return '⎇'
    default:
      return '○'
  }
})

function toggleExpand() {
  expanded.value = !expanded.value
}

function selectNode() {
  viewer.value?.selectNode(props.node.uuid)
}

function focusNode() {
  viewer.value?.focusNode(props.node.uuid)
}

function toggleVisibility() {
  viewer.value?.setNodeVisibility(props.node.uuid, !props.node.visible)
}
</script>

<style scoped>
.scene-tree-item {
  display: flex;
  flex-direction: column;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
  font-size: 12px;
  min-width: max-content;
}

.tree-row:hover {
  background: rgba(0, 212, 255, 0.08);
}

.tree-row.selected {
  background: rgba(0, 212, 255, 0.15);
  border: 1px solid var(--accent-cyan);
}

.tree-row.hidden {
  opacity: 0.6;
}

.expand-arrow {
  font-size: 9px;
  color: var(--text-muted);
  transition: transform 0.2s;
  flex-shrink: 0;
  width: 12px;
  text-align: center;
}

.expand-arrow.expanded {
  transform: rotate(90deg);
}

.expand-placeholder {
  width: 12px;
  flex-shrink: 0;
}

.tree-row input[type='checkbox'] {
  accent-color: var(--accent-cyan);
  flex-shrink: 0;
  cursor: pointer;
}

.node-icon {
  color: var(--accent-cyan);
  flex-shrink: 0;
  width: 16px;
  text-align: center;
}

.node-name {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-type {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 5px;
  border-radius: 2px;
  flex-shrink: 0;
}

.tree-children {
  display: flex;
  flex-direction: column;
}
</style>
