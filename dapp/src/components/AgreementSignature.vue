<script setup>
import { ref } from 'vue';
import { useLocale } from '../composables/useLocale.js';
const emit = defineEmits(['update:modelValue']);
const { lang } = useLocale();
const canvas = ref(null);
let drawing = false;
let lastPoint;
let distance = 0;

function point(event) {
  const rect = canvas.value.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * canvas.value.width / rect.width, y: (event.clientY - rect.top) * canvas.value.height / rect.height };
}
function start(event) {
  if (event.button !== 0 || drawing) return;
  drawing = true;
  lastPoint = point(event);
  canvas.value.setPointerCapture(event.pointerId);
}
function move(event) {
  if (!drawing) return;
  const current = point(event);
  const ctx = canvas.value.getContext('2d');
  ctx.strokeStyle = '#7d2bcb';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(lastPoint.x, lastPoint.y);
  ctx.lineTo(current.x, current.y);
  ctx.stroke();
  distance += Math.hypot(current.x - lastPoint.x, current.y - lastPoint.y);
  lastPoint = current;
}
function stop() {
  if (!drawing) return;
  drawing = false;
  emit('update:modelValue', distance >= 20 ? canvas.value.toDataURL('image/png') : '');
}
function clear() {
  drawing = false;
  distance = 0;
  canvas.value.getContext('2d').clearRect(0, 0, canvas.value.width, canvas.value.height);
  emit('update:modelValue', '');
}
</script>

<template>
  <div class="signature-pad">
    <p>{{ lang('请在下方手写签名') }}</p>
    <canvas ref="canvas" width="800" height="300" :aria-label="lang('电子签名区域')" @pointerdown.prevent="start" @pointermove.prevent="move" @pointerup="stop" @pointercancel="stop" @lostpointercapture="stop"></canvas>
    <button type="button" @click="clear">{{ lang('清除签名') }}</button>
  </div>
</template>

<style scoped>
.signature-pad p { color: #918498; font-size: 12px; }
canvas { display: block; width: 100%; height: 150px; border: 1px dashed #b79cd5; border-radius: 10px; background: #fff; touch-action: none; }
button { margin-top: 10px; padding: 6px 12px; border: 1px solid #d9c9ed; border-radius: 7px; background: #fff; color: #8635cc; cursor: pointer; }
</style>
