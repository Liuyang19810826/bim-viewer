import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/utils/constants'
import type { AppSettings, GeneralSettings, RenderSettings } from '@/types'

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      return {
        render: { ...DEFAULT_SETTINGS.render, ...(parsed.render || {}) },
        general: { ...DEFAULT_SETTINGS.general, ...(parsed.general || {}) },
        apiEnabled: parsed.apiEnabled ?? DEFAULT_SETTINGS.apiEnabled,
        allowedOrigins: parsed.allowedOrigins ?? DEFAULT_SETTINGS.allowedOrigins,
      }
    }
  } catch {
    // ignore
  }
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(loadSettings())

  const render = computed(() => settings.value.render)
  const general = computed(() => settings.value.general)

  function updateRender(partial: Partial<RenderSettings>) {
    settings.value.render = { ...settings.value.render, ...partial }
  }

  function updateGeneral(partial: Partial<GeneralSettings>) {
    settings.value.general = { ...settings.value.general, ...partial }
  }

  function setApiEnabled(enabled: boolean) {
    settings.value.apiEnabled = enabled
  }

  function setAllowedOrigins(origins: string[]) {
    settings.value.allowedOrigins = origins
  }

  function resetRender() {
    settings.value.render = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.render)) as RenderSettings
  }

  function resetGeneral() {
    settings.value.general = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.general)) as GeneralSettings
  }

  function resetAll() {
    settings.value = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings
  }

  watch(
    settings,
    (val) => {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(val))
    },
    { deep: true }
  )

  return {
    settings,
    render,
    general,
    updateRender,
    updateGeneral,
    setApiEnabled,
    setAllowedOrigins,
    resetRender,
    resetGeneral,
    resetAll,
  }
})
