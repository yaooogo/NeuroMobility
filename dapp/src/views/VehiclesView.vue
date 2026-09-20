<script setup>
import { useRouter } from "vue-router";
import AppIcon from "../components/AppIcon.vue";
import { useLocale } from "../composables/useLocale.js";
import vehicleImage from "../assets/images/vehicle-alphard.jpg";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  vehicles: {
    type: Array,
    default: () => Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      name: "Toyota Alphard",
      model: "2.5 Executive Lounge",
      image: vehicleImage,
      tags: ["豪华MPV", "真皮座椅", "全景天窗", "热门车型"],
      seats: 7,
      luggage: 3,
      insured: true
    }))
  }
});

const router = useRouter();
const { lang } = useLocale();

function translateTag(text) {
  if (text === "豪华MPV") return lang("豪华MPV");
  if (text === "真皮座椅") return lang("真皮座椅");
  if (text === "全景天窗") return lang("全景天窗");
  if (text === "热门车型") return lang("热门车型");
  return lang(text);
}
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

    <div class="vehicle-list">
      <article v-for="vehicle in props.vehicles" :key="vehicle.id" class="vehicle-card">
        <img :src="vehicle.image || vehicleImage" :alt="vehicle.name" />
        <div class="vehicle-info">
          <h2>{{ vehicle.name }}</h2>
          <p>{{ vehicle.model }}</p>
          <div class="vehicle-tags">
            <span v-for="(tag, index) in vehicle.tags" :key="tag" :class="{ popular: index === vehicle.tags.length - 1 }">{{ translateTag(tag) }}</span>
          </div>
        </div>
      </article>
      <p v-if="!props.vehicles.length" class="vehicles-empty">{{ lang("暂无车辆") }}</p>
    </div>
  </section>
</template>

<style scoped>
.vehicles-view { min-height: 100vh; padding: 0 16px 30px; background: #fff; color: #4a474c; }
.vehicles-header { height: 94px; display: grid; grid-template-columns: 42px 1fr 42px; align-items: end; padding: max(17px, env(safe-area-inset-top)) 0 23px; }
.vehicles-header h1 { margin: 0; color: #111014; font-size: 21px; line-height: 31px; text-align: center; }
.vehicles-header button { width: 40px; height: 33px; display: grid; place-items: start; padding: 3px 0; border: 0; background: transparent; color: #812bd8; cursor: pointer; }
.vehicles-header button svg { width: 27px; transform: rotate(180deg); }
.vehicle-list { display: grid; gap: 18px; }
.vehicle-card { min-height: 130px; display: grid; grid-template-columns: 100px minmax(0,1fr); gap: 16px; padding: 16px; border: 1px solid #f3edf7; border-radius: 18px; background: #fff; box-shadow: 0 7px 22px rgba(91,48,127,.075); }
.vehicle-card > img { width:100px; height: 100px; align-self: center; border-radius: 11px; object-fit: cover; }
.vehicle-info { min-width: 0; align-self: center; }
.vehicle-info h2 { margin: 0; color: #4a474b; font-size: 17px; line-height: 1.15; }
.vehicle-info > p { margin: 9px 0 10px; font-size: 13px; line-height: 1; }
.vehicle-tags { display: flex; gap: 8px; overflow: hidden; }
.vehicle-tags span { flex: 0 0 auto; padding: 5px 11px; border-radius: 13px; background: #ead7fa; color: #8c3bd2; font-size: 10px; line-height: 1; }
.vehicle-tags .popular { background: #c9f3d0; color: #13a834; }
.vehicle-features { display: flex; justify-content: space-between; gap: 7px; margin-top: 11px; overflow: hidden; }
.vehicle-features > span { min-width: 0; display: flex; align-items: center; gap: 5px; font-size: 10px; white-space: nowrap; }
.vehicle-features i { width: 21px; height: 21px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%; background: #f5f4f5; color: #56525a; }
.vehicle-features svg { width: 12px; height: 12px; stroke-width: 1.8; }
.vehicles-empty { margin: 80px 0 0; color: #aaa3ad; font-size: 14px; text-align: center; }
@media (max-width: 410px) {
  .vehicles-view { padding-left: 10px; padding-right: 10px; }
  .vehicle-card { grid-template-columns: 101px minmax(0,1fr); gap: 11px; padding: 12px; }
  .vehicle-card > img { width: 101px; height: 112px; }
  .vehicle-info h2 { font-size: 17px; }
  .vehicle-info > p { margin: 7px 0; font-size: 12px; }
  .vehicle-tags { gap: 4px; }
  .vehicle-tags span { padding: 4px 7px; font-size: 9px; }
  .vehicle-features { gap: 4px; margin-top: 8px; }
  .vehicle-features > span { gap: 3px; font-size: 8px; }
  .vehicle-features i { width: 18px; height: 18px; }
}
</style>
