<script setup lang="ts">
import { onMounted } from 'vue'
import GlobalHeader from '@/components/GlobalHeader.vue'
import { useCareData } from '@/composables/useCareData'

const { hydrateScope } = useCareData()

onMounted(() => {
  hydrateScope()
})
</script>

<template>
  <div class="app-shell">
    <div class="background-glow" aria-hidden="true" />
    <GlobalHeader />
    <main class="main-panel">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
  padding: clamp(1rem, 3vw, 2.5rem);
}

.background-glow {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at 10% 20%, rgba(120, 143, 255, 0.25), transparent 45%),
    radial-gradient(circle at 80% 0%, rgba(251, 113, 133, 0.18), transparent 40%),
    radial-gradient(circle at 60% 80%, rgba(45, 212, 191, 0.15), transparent 40%);
  filter: blur(90px);
  pointer-events: none;
}

.main-panel {
  position: relative;
  z-index: 1;
  margin-top: clamp(0.5rem, 2vw, 1rem);
}
</style>
