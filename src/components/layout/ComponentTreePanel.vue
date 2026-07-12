<template>
  <aside
    v-if="viewerStore.modelLoaded"
    ref="panelRef"
    class="component-tree-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="图元分类">
      <template #extra>
        <span class="toggle-btn" @click="collapsed = !collapsed">{{ collapsed ? '展开' : '收起' }}</span>
      </template>
      <div v-show="!collapsed" class="panel-content">
        <div class="tree-toolbar">
          <TechButton @click="selectAll">全选</TechButton>
          <TechButton @click="clearSelection">清空</TechButton>
          <TechButton @click="showSelectedOnly">仅看选中</TechButton>
          <TechButton @click="showAll">显示全部</TechButton>
        </div>
        <div class="tree-filter">
          <input v-model="filterText" type="text" placeholder="搜索图元名称 / 类型 / 专业" />
        </div>
        <div class="tree-batch">
          <TechSlider
            :model-value="batchOpacity"
            label="批量透明度"
            :min="0"
            :max="1"
            :step="0.05"
            :display-value="Math.round(batchOpacity * 100) + '%'"
            @update:model-value="setBatchOpacity"
          />
          <div class="batch-actions">
            <TechButton @click="batchShow">显示</TechButton>
            <TechButton @click="batchHide">隐藏</TechButton>
          </div>
        </div>

        <div class="group-list">
          <div v-for="group in pageGroups" :key="group.key" class="group-item">
            <div class="group-header">
              <span
                class="group-arrow"
                :class="{ expanded: expandedGroups.has(group.key) }"
                @click.stop="toggleGroup(group.key)"
              >▶</span>
              <span class="group-name" @click.stop="toggleGroup(group.key)">{{ group.key }}</span>
              <span class="group-count" @click.stop="toggleGroup(group.key)">({{ group.items.length }})</span>
            </div>
            <div v-show="expandedGroups.has(group.key)" class="group-children">
              <div class="group-color-row" @click.stop>
                <span class="color-label">分类颜色</span>
                <ColorPicker :model-value="groupColors[group.key]" @update:model-value="setGroupColor(group.key, $event)" />
              </div>
              <div
                v-for="item in group.items"
                :key="item.id"
                class="tree-item"
                :class="{ selected: selectedIds.has(item.id) }"
                @click="toggleSelect(item.id)"
              >
                <input
                  type="checkbox"
                  :checked="selectedIds.has(item.id)"
                  @click.stop
                  @change="toggleSelect(item.id)"
                />
                <div class="tree-item-info">
                  <div class="tree-item-name" :title="item.name">{{ item.name }}</div>
                  <div class="tree-item-meta">
                    <span class="meta-tag discipline">{{ item.discipline }}</span>
                    <span class="meta-tag type">{{ item.type }}</span>
                    <span v-if="!item.visible" class="meta-tag hidden">隐藏</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="totalPages > 1" class="pagination">
            <TechButton :disabled="currentPage === 1" @click="currentPage--">上一页</TechButton>
            <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
            <TechButton :disabled="currentPage === totalPages" @click="currentPage++">下一页</TechButton>
          </div>
          <div v-else-if="pageGroups.length === 0" class="empty-tip">无匹配图元</div>
        </div>
      </div>
    </TechPanel>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from '@/composables/useBIMViewer'
import { useLogStore } from '@/stores/logStore'
import { useDraggable } from '@/composables/useDraggable'
import { useResizable } from '@/composables/useResizable'
import TechPanel from '@/components/common/TechPanel.vue'
import TechButton from '@/components/common/TechButton.vue'
import TechSlider from '@/components/common/TechSlider.vue'
import ColorPicker from '@/components/common/ColorPicker.vue'
import type { ComponentTreeItem } from '@/types'

const PAGE_SIZE = 20

const viewerStore = useViewerStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 260, minHeight: 200 })

const collapsed = ref(false)
const filterText = ref('')
const selectedIds = ref<Set<string>>(new Set())
const batchOpacity = ref(1)
const items = ref<ComponentTreeItem[]>([])
const expandedGroups = ref<Set<string>>(new Set())
const groupColors = ref<Record<string, string>>({})
const currentPage = ref(1)

function refreshItems() {
  items.value = viewer.value?.getComponentTree() || []
  const groups = new Set(items.value.map((i) => i.discipline || '其他'))
  groups.forEach((g) => {
    if (!expandedGroups.value.has(g)) {
      expandedGroups.value.add(g)
    }
  })
}

watch(() => viewerStore.modelLoaded, (loaded) => {
  if (loaded) {
    refreshItems()
  } else {
    items.value = []
    selectedIds.value.clear()
    expandedGroups.value.clear()
    currentPage.value = 1
  }
})

watch(filterText, () => {
  currentPage.value = 1
})

const filteredItems = computed(() => {
  const text = filterText.value.trim().toLowerCase()
  if (!text) return items.value
  return items.value.filter((i) =>
    i.name.toLowerCase().includes(text) ||
    i.type.toLowerCase().includes(text) ||
    i.discipline.toLowerCase().includes(text)
  )
})

const totalPages = computed(() => Math.ceil(filteredItems.value.length / PAGE_SIZE))

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredItems.value.slice(start, start + PAGE_SIZE)
})

const pageGroups = computed(() => {
  const map = new Map<string, ComponentTreeItem[]>()
  pagedItems.value.forEach((item) => {
    const key = item.discipline || '其他'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  })
  return Array.from(map.entries()).map(([key, items]) => ({ key, items }))
})

function toggleGroup(key: string) {
  const next = new Set(expandedGroups.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  expandedGroups.value = next
}

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
}

function selectAll() {
  selectedIds.value = new Set(pageGroups.value.flatMap((g) => g.items.map((i) => i.id)))
}

function clearSelection() {
  selectedIds.value = new Set()
}

function showSelectedOnly() {
  const ids = Array.from(selectedIds.value)
  const allIds = items.value.map((i) => i.id)
  viewer.value?.setComponentsVisibility(allIds, false)
  viewer.value?.setComponentsVisibility(ids, true)
  useLogStore().add('仅显示选中图元', 'success', 'user')
  refreshItems()
}

function showAll() {
  const allIds = items.value.map((i) => i.id)
  viewer.value?.setComponentsVisibility(allIds, true)
  useLogStore().add('显示全部图元', 'success', 'user')
  refreshItems()
}

function setBatchOpacity(value: number) {
  batchOpacity.value = value
}

function batchShow() {
  const ids = Array.from(selectedIds.value)
  if (ids.length === 0) return
  viewer.value?.setComponentsVisibility(ids, true)
  viewer.value?.setComponentsOpacity(ids, batchOpacity.value)
  useLogStore().add(`批量设置 ${ids.length} 个图元显示`, 'success', 'user')
  refreshItems()
}

function batchHide() {
  const ids = Array.from(selectedIds.value)
  if (ids.length === 0) return
  viewer.value?.setComponentsVisibility(ids, false)
  useLogStore().add(`批量隐藏 ${ids.length} 个图元`, 'success', 'user')
  refreshItems()
}

function setGroupColor(key: string, color: string) {
  groupColors.value[key] = color
  const ids = pageGroups.value.find((g) => g.key === key)?.items.map((i) => i.id) || []
  viewer.value?.setComponentsColor(ids, color)
  useLogStore().add(`设置分类「${key}」颜色`, 'success', 'user')
}
</script>

<style scoped>
.component-tree-panel {
  position: absolute;
  left: 16px;
  top: calc(var(--header-height) + 260px);
  width: var(--panel-width);
  max-height: calc(100% - 32px);
  overflow: hidden;
  z-index: 50;
}

.panel-content {
  display: flex;
  flex-direction: column;
  height: calc(100% - 48px);
  overflow: hidden;
}

.toggle-btn {
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
}

.toggle-btn:hover {
  color: var(--accent-cyan);
}

.tree-toolbar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 10px;
}

.tree-toolbar .tech-button {
  padding: 5px 8px;
  font-size: 11px;
}

.tree-filter input {
  width: 100%;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 12px;
  margin-bottom: 10px;
}

.tree-batch {
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--bg-panel-border);
}

.batch-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.batch-actions .tech-button {
  flex: 1;
  padding: 5px 8px;
  font-size: 11px;
}

.group-list {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
  min-height: 0;
}

.group-list::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.group-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
}

.group-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.group-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.group-list::-webkit-scrollbar {
  width: 6px;
}

.group-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
}

.group-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.group-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.group-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.group-header:hover {
  background: rgba(0, 212, 255, 0.08);
}

.group-arrow {
  font-size: 10px;
  color: var(--text-muted);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.group-arrow.expanded {
  transform: rotate(90deg);
}

.group-name {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-count {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.group-children {
  padding: 0 10px 8px 28px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.color-label {
  font-size: 11px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
  font-size: 12px;
  min-width: max-content;
}

.tree-item:hover {
  background: rgba(0, 212, 255, 0.08);
}

.tree-item.selected {
  background: rgba(0, 212, 255, 0.15);
  border: 1px solid var(--accent-cyan);
}

.tree-item input[type='checkbox'] {
  accent-color: var(--accent-cyan);
  flex-shrink: 0;
}

.tree-item-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.tree-item-name {
  color: var(--text-primary);
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.meta-tag {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 2px;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.08);
}

.meta-tag.discipline {
  color: var(--accent-cyan);
  background: rgba(0, 212, 255, 0.1);
}

.meta-tag.hidden {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 4px;
  border-top: 1px solid var(--bg-panel-border);
  margin-top: 4px;
}

.pagination .tech-button {
  padding: 5px 10px;
  font-size: 11px;
}

.page-info {
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-tip {
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  padding: 16px 0;
}
</style>
