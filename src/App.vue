<template>
  <AppHeader />
  <main class="main-content">
    <ViewerCanvas />
    <LogPanel />
    <ComponentTreePanel />
    <PropertyPanel />
    <ClipControlPanel />
    <FloorBar />
    <FloorPanel />
    <ViewCube />
    <AxesIcon />
  </main>
  <StatusBar />
</template>

<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import ViewerCanvas from '@/components/viewer/ViewerCanvas.vue'
import LogPanel from '@/components/layout/LogPanel.vue'
import ComponentTreePanel from '@/components/layout/ComponentTreePanel.vue'
import PropertyPanel from '@/components/layout/PropertyPanel.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import ClipControlPanel from '@/components/viewer/ClipControlPanel.vue'
import FloorBar from '@/components/layout/FloorBar.vue'
import FloorPanel from '@/components/layout/FloorPanel.vue'
import ViewCube from '@/components/viewer/ViewCube.vue'
import AxesIcon from '@/components/viewer/AxesIcon.vue'
</script>

<style scoped>
.main-content {
  position: relative;
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}
</style>
