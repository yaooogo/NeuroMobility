<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import { requestVehicles } from "../lib/api.js";
import vehicleImage from "../assets/images/vehicle-alphard.jpg";

defineOptions({ inheritAttrs: false });

const router = useRouter();
const { lang, locale } = useLocale();
const vehicles = ref([]);
const loading = ref(true);
const errorMessage = ref("");
let requestId = 0;

async function loadVehicles() {
  const currentRequestId = ++requestId;
  loading.value = true;
  errorMessage.value = "";
  try {
    const items = await requestVehicles(locale.value);
    if (currentRequestId !== requestId) return;
    vehicles.value = items;
  } catch (error) {
    if (currentRequestId !== requestId) return;
    errorMessage.value = error?.message || lang("加载失败，请稍后重试");
  } finally {
    if (currentRequestId === requestId) loading.value = false;
  }
}

watch(locale, loadVehicles, { immediate: true });
</script>

<template>
  <section class="vehicles-view">
    <header class="vehicles-header">
      <button type="button" :aria-label="lang('返回首页')" @click="router.push({ name: 'home' })">
        <AppIcon name="chevron" />
      </button>
      <h1>{{ lang("车辆详情") }}</h1>
      <span></span>
    </header>

    <div v-if="loading" class="content-state">{{ lang("正在加载...") }}</div>
    <div v-else-if="errorMessage" class="content-state content-state--error">
      <span>{{ errorMessage }}</span>
      <button type="button" @click="loadVehicles">{{ lang("重新加载") }}</button>
    </div>
    <p v-else-if="!vehicles.length" class="vehicles-empty">{{ lang("暂无车辆") }}</p>

    <div v-else class="vehicle-list">
      <article v-for="vehicle in vehicles" :key="vehicle.id" class="vehicle-card">
        <img :src="vehicle.image || vehicleImage" :alt="vehicle.name" />
        <div class="vehicle-info">
          <h2>{{ vehicle.name }}</h2>
          <p v-if="vehicle.model">{{ vehicle.model }}</p>
          <div v-if="vehicle.tags?.length" class="vehicle-tags">
            <span
              v-for="(tag, index) in vehicle.tags"
              :key="`${vehicle.id}-${index}`"
              :style="{ backgroundColor: tag.background_color, color: tag.text_color }"
            >{{ tag.label }}</span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.vehicles-view { min-height: 100vh; padding: 0 16px 30px; background: #fff; color: #4a474c; }
.vehicles-header { height: 70px; display: grid; grid-template-columns: 42px 1fr 42px; align-items: end; padding: max(17px, env(safe-area-inset-top)) 0 23px; }
.vehicles-header h1 { margin: 0; color: #111014; font-size: 18px; line-height: 31px; text-align: center; }
.vehicles-header button { width: 40px; height: 33px; display: grid; place-items: start; padding: 3px 0; border: 0; background: transparent; color: #812bd8; cursor: pointer; }
.vehicles-header button svg { width: 27px; transform: rotate(180deg); }
.content-state { min-height: 220px; display: grid; place-content: center; justify-items: center; gap: 12px; color: #8b8490; font-size: 14px; text-align: center; }
.content-state--error { color: #b14558; }
.content-state button { padding: 8px 18px; border: 0; border-radius: 18px; background: #8731dc; color: #fff; cursor: pointer; }
.vehicle-list { display: grid; gap: 18px; }
.vehicle-card { min-height: 130px; display: grid; grid-template-columns: 100px minmax(0,1fr); gap: 16px; padding: 16px; border: 1px solid #f3edf7; border-radius: 18px; background: #fff; box-shadow: 0 7px 22px rgba(91,48,127,.075); }
.vehicle-card > img { width:100px; height: 100px; align-self: center; border-radius: 11px; object-fit: cover; }
.vehicle-info { min-width: 0; align-self: center; }
.vehicle-info h2 { margin: 0; color: #4a474b; font-size: 17px; line-height: 1.15; }
.vehicle-info > p { margin: 9px 0 10px; font-size: 13px; line-height: 1.2; }
.vehicle-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.vehicle-tags span { flex: 0 0 auto; padding: 5px 11px; border-radius: 13px; font-size: 10px; line-height: 1; }
.vehicles-empty { margin: 80px 0 0; color: #aaa3ad; font-size: 14px; text-align: center; }
@media (max-width: 410px) {
  .vehicles-view { padding-left: 10px; padding-right: 10px; }
  .vehicle-card { grid-template-columns: 101px minmax(0,1fr); gap: 11px; padding: 12px; }
  .vehicle-card > img { width: 101px; height: 112px; }
  .vehicle-info h2 { font-size: 17px; }
  .vehicle-info > p { margin: 7px 0; font-size: 12px; }
  .vehicle-tags { gap: 4px; }
  .vehicle-tags span { padding: 4px 7px; font-size: 9px; }
}
</style>
