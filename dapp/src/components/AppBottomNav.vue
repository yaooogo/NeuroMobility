<script setup>
import { useLocale } from "../composables/useLocale.js";
import menu1Inactive from "../assets/images/menu/m1_0.png";
import menu1Active from "../assets/images/menu/m1_1.png";
import menu2Inactive from "../assets/images/menu/m2_0.png";
import menu2Active from "../assets/images/menu/m2_1.png";
import menu3Inactive from "../assets/images/menu/m3_0.png";
import menu3Active from "../assets/images/menu/m3_1.png";
import menu4Inactive from "../assets/images/menu/m4_0.png";
import menu4Active from "../assets/images/menu/m4_1.png";

const menuIcons = {
  home: [menu1Inactive, menu1Active],
  invest: [menu2Inactive, menu2Active],
  assets: [menu3Inactive, menu3Active],
  mine: [menu4Inactive, menu4Active]
};

const props = defineProps({
  items: {
    type: Array,
    default: () => [
      { key: "home", label: "首页", icon: "home" },
      { key: "invest", label: "投资", icon: "compass" },
      { key: "assets", label: "资产", icon: "stack" },
      { key: "mine", label: "我的", icon: "user" }
    ]
  },
  activeKey: {
    type: String,
    default: "home"
  },
  ariaLabel: {
    type: String,
    default: "Primary"
  }
});

const emit = defineEmits(["select", "update:activeKey"]);
const { lang } = useLocale();

function selectItem(item) {
  if (item.disabled) return;
  emit("update:activeKey", item.key);
  emit("select", item);
}

function getMenuIcon(item, index) {
  const fallback = Object.values(menuIcons)[index] || menuIcons.home;
  const icons = menuIcons[item.key] || fallback;
  return icons[item.key === props.activeKey ? 1 : 0];
}
</script>

<template>
  <nav class="bottom-nav" :aria-label="ariaLabel">
    <button
      v-for="(item, index) in props.items"
      :key="item.key"
      type="button"
      :class="{ active: item.key === activeKey }"
      :disabled="item.disabled"
      :aria-current="item.key === activeKey ? 'page' : undefined"
      @click="selectItem(item)"
    >
      <img class="bottom-nav__icon" :src="getMenuIcon(item, index)" alt="" />
      <span>{{ lang(item.label) }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  z-index: 20;
  left: 50%;
  bottom: 0;
  width: min(100%, 480px);
  height: calc(68px + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 8px 13px env(safe-area-inset-bottom);
  border-top: 1px solid #efedf2;
  border-radius: 12px 12px 0 0;
  background: rgba(255, 255, 255, .95);
  box-shadow: 0 -7px 22px rgba(62, 45, 82, .06);
  transform: translateX(-50%);
  backdrop-filter: blur(16px);
}

.bottom-nav button {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: 0;
  background: transparent;
  color: #8c898e;
  font-size: 12px;
  cursor: pointer;
}

.bottom-nav button:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.bottom-nav button.active {
  color: #9a3fed;
  font-weight: 700;
}

.bottom-nav__icon {
  width: 24px;
  height: 24px;
  display: block;
  object-fit: contain;
}
</style>
