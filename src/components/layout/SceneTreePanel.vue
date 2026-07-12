<template>
  <aside
    v-if="viewerStore.modelLoaded && viewerStore.showSceneTreePanel"
    ref="panelRef"
    class="scene-tree-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="场景树">
      <template #extra>
        <span class="close-btn" @click="viewerStore.setShowSceneTreePanel(false)">✕</span>
      </template>
      <div class="tree-toolbar">
        <input v-model="filterText" type="text" placeholder="搜索节点名称" />
        <TechButton @click="expandAll">全部展开</TechButton>
        <TechButton @click="collapseAll">全部收起</TechButton>
      </div>
      <div class="tree-list">
        <SceneTreeItem
          v-for="child in filteredTree"
          :key="child.uuid"
          :node="child"
          :depth="0"
        />
        <div v-if="filteredTree.length === 0" class="empty-tip">无匹配节点</div>
      </div>
    </TechPanel>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from '@/composables/useBIMViewer'
import { useDraggable } from '@/composables/useDraggable'
import { useResizable } from '@/composables/useResizable'
import TechPanel from '@/components/common/TechPanel.vue'
import TechButton from '@/components/common/TechButton.vue'
import SceneTreeItem from '@/components/layout/SceneTreeItem.vue'
import type { SceneTreeNode } from '@/types'

const viewerStore = useViewerStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 280, minHeight: 220 })

const filterText = ref('')
const expandSignal = ref(0)
provide('sceneTreeExpandSignal', expandSignal)

const tree = computed<SceneTreeNode[]>(() => viewer.value?.getSceneTree() || [])

function filterNode(node: SceneTreeNode, text: string): SceneTreeNode | null {
  const match = node.name.toLowerCase().includes(text) || node.type.toLowerCase().includes(text)
  const children: SceneTreeNode[] = []
  node.children.forEach((child) => {
    const filtered = filterNode(child, text)
    if (filtered) children.push(filtered)
  })
  if (match || children.length > 0) {
    return { ...node, children }
  }
  return null
}

const filteredTree = computed<SceneTreeNode[]>(() => {
  const text = filterText.value.trim().toLowerCase()
  if (!text) return tree.value
  return tree.value.map((node) => filterNode(node, text)).filter((n): n is SceneTreeNode => n !== null)
})

function expandAll() {
  expandSignal.value++
}

function collapseAll() {
  expandSignal.value--
}

watch(filterText, () => {
  if (filterText.value.trim()) expandAll()
})

watch(() => viewerStore.modelLoaded, (loaded) => {
  if (!loaded) filterText.value = ''
})
</script>

<style scoped>
.scene-tree-panel {
  position: absolute;
  left: 16px;
  top: calc(var(--header-height) + 420px);
  width: var(--panel-width);
  max-height: calc(100% - 32px);
  overflow: hidden;
  z-index: 52;
}

.close-btn {
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--danger);
}

.tree-toolbar {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.tree-toolbar input {
  flex: 1 1 100%;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 12px;
}

.tree-toolbar .tech-button {
  flex: 1;
  padding: 5px 8px;
  font-size: 11px;
}

.tree-list {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 4px;
  max-height: calc(100vh - var(--header-height) - var(--status-height) - 260px);
}

.tree-list::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.tree-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
}

.tree-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.tree-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.empty-tip {
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  padding: 16px 0;
}
</style>
