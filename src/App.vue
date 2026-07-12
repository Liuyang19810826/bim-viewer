<template>
  <AppHeader />
  <main class="main-content">
    <ViewerCanvas />
    <LogPanel />
    <ComponentTreePanel />
    <SceneTreePanel />
    <ModelStatsPanel />
    <NodePropertiesPanel />
    <MaterialPanel />
    <LightingPanel />
    <PostProcessingPanel />
    <ValidationPanel />
    <PerformancePanel />
    <MeasurementPanel />
    <RegionZoomPanel />
    <HumanEyePanel />
    <PropertyPanel />
    <ClipControlPanel />
    <FloorListPanel />
    <FloorPanel />
    <LoadSummaryDialog />
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
import SceneTreePanel from '@/components/layout/SceneTreePanel.vue'
import ModelStatsPanel from '@/components/layout/ModelStatsPanel.vue'
import NodePropertiesPanel from '@/components/layout/NodePropertiesPanel.vue'
import MaterialPanel from '@/components/layout/MaterialPanel.vue'
import LightingPanel from '@/components/layout/LightingPanel.vue'
import PostProcessingPanel from '@/components/layout/PostProcessingPanel.vue'
import ValidationPanel from '@/components/layout/ValidationPanel.vue'
import PerformancePanel from '@/components/layout/PerformancePanel.vue'
import MeasurementPanel from '@/components/layout/MeasurementPanel.vue'
import RegionZoomPanel from '@/components/layout/RegionZoomPanel.vue'
import HumanEyePanel from '@/components/viewer/HumanEyePanel.vue'
import PropertyPanel from '@/components/layout/PropertyPanel.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import ClipControlPanel from '@/components/viewer/ClipControlPanel.vue'
import FloorListPanel from '@/components/layout/FloorListPanel.vue'
import FloorPanel from '@/components/layout/FloorPanel.vue'
import LoadSummaryDialog from '@/components/common/LoadSummaryDialog.vue'
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
