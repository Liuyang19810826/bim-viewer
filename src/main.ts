import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import { sdkInstance } from './api/SDK'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

// Expose SDK globally for third-party integration
;(window as unknown as Record<string, unknown>).BIMViewerSDK = sdkInstance
