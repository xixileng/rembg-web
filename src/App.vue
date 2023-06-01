<script setup lang="ts">
import { ref, reactive } from 'vue'
import Rembg from './utils/rembg?worker'
// @ts-ignore-next-line

const containerStyle = reactive({ clip: `rect(0px, 250px, 500px, 0px)`, })
const isModelLoaded = ref(false)
const loading = ref(false)
const sourceSrc = ref('')
const targetSrc = ref('')

const rembg = new Rembg()

rembg.onmessage = (event: any) => {
  if (event.data === 'modelLoaded') {
    isModelLoaded.value = true
  } else if (event.data[0] === 'result') {
    targetSrc.value = event.data[1]
    loading.value = false
  }
}

rembg.postMessage('loadModel')

const onSourceLoaded = async (event: any) => {
  loading.value = true
  rembg.postMessage(['rembg', event.target.src])
}
const onRangeChange = (event: any) => {
  const value = event.target.value;
  containerStyle.clip = `rect(0px, ${5 * value}px, 500px, 0px)`;
}
const onFileSelected = (event: any) => {
  targetSrc.value = ''

  const file = event.target.files[0]
  const reader = new FileReader();
  reader.onload = function (event) {
    sourceSrc.value = (event.target as FileReader).result as string;
  }
  reader.readAsDataURL(file);
}
</script>

<template>
  <div class="wrapper">

    <div v-show="!isModelLoaded" class="loading">模型加载中，请稍后···</div>
    <div v-show="loading" class="loading">处理中，请稍后···</div>

    <div class="image-container">
      <div class="source-container" :style="containerStyle">
        <img class="source" :src="sourceSrc" alt="" @load="onSourceLoaded">
      </div>
      <div class="target-container">
        <img class="target" :src="targetSrc" alt="">
      </div>
    </div>

    <input type="range" min="0" max="100" step="1" value="50" @input="onRangeChange" />

    <input type="file" name="" accept="image/*" @change="onFileSelected">
  </div>
</template>

<style scoped>
.wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
}

.image-container {
  position: relative;
  width: 500px;
  height: 500px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.06), 0 6px 12px 0 rgba(0, 0, 0, 0.08);
}

.source-container,
.target-container {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.source {
  z-index: 1;
}

.target {
  background-image: linear-gradient(45deg, #e2e2e2 25%, transparent 0, transparent 75%, #e2e2e2 0, #e2e2e2),
    linear-gradient(45deg, #e2e2e2 25%, transparent 0, transparent 75%, #e2e2e2 0, #e2e2e2);
  background-size: 10px 10px;
  background-position: 0 0, 5px 5px;
}

.loading {
  display: flex;
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.8);
  font-size: 24px;
}

input[type="range"] {
  width: 500px;
}
</style>
