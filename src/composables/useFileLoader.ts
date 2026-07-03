import { useViewerStore } from '@/stores/viewerStore'
import { useLogStore } from '@/stores/logStore'
import { fileListToFiles } from '@/utils/fileUtils'
import { viewer } from './useBIMViewer'
import type { Ref } from 'vue'

export function useFileLoader(fileInput: Ref<HTMLInputElement | null>) {
  function openFolderPicker() {
    fileInput.value?.click()
  }

  async function onFolderSelected(event: Event) {
    const target = event.target as HTMLInputElement
    const files = fileListToFiles(target.files)
    if (files.length === 0) return

    const v = viewer.value
    if (!v) {
      useLogStore().add('模型加载', 'fail', 'user', '渲染器未初始化')
      return
    }

    const result = await v.loadModel(files)
    if (result.code !== 200) {
      useViewerStore().setStatusMessage(result.message)
    }

    if (target) target.value = ''
  }

  return {
    openFolderPicker,
    onFolderSelected,
  }
}
