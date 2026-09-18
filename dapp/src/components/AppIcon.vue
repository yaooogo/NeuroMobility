<script setup>
defineProps({ name: { type: String, required: true } });
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'coin'"><circle cx="12" cy="12" r="8"/><path d="M15 8.5h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/></template>
    <template v-else-if="name === 'car'"><path d="m5 11 1.4-4h11.2l1.4 4M3.5 13h17v5h-2v2h-3v-2h-7v2h-3v-2h-2z"/><circle cx="7" cy="14.5" r="1"/><circle cx="17" cy="14.5" r="1"/></template>
    <template v-else-if="name === 'record'"><path d="M7 3h10v3h3v15H4V6h3z"/><path d="M8 11h8m-8 4h5M9 3v4m6-4v4"/></template>
    <template v-else-if="name === 'mail'"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m5 8 7 5 7-5m-5-5 2 2"/></template>
    <template v-else-if="name === 'users'"><circle cx="12" cy="8" r="3"/><path d="M6 20a6 6 0 0 1 12 0"/></template>
    <template v-else-if="name === 'coins'"><ellipse cx="9" cy="6" rx="5" ry="2.5"/><path d="M4 6v5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V6M4 11v5c0 1.4 2.2 2.5 5 2.5 1 0 2-.2 2.8-.5"/><ellipse cx="16.5" cy="14" rx="4.5" ry="2.5"/><path d="M12 14v4.5c0 1.4 2 2.5 4.5 2.5s4.5-1.1 4.5-2.5V14"/></template>
    <template v-else-if="name === 'share'"><circle cx="6" cy="12" r="2.3"/><circle cx="17.5" cy="5" r="2.3"/><circle cx="17.5" cy="19" r="2.3"/><path d="m8 11 7.4-4.5M8 13l7.4 4.5"/></template>
    <template v-else-if="name === 'partner'"><circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><path d="M2.8 19a5.2 5.2 0 0 1 8.8-3.8M21.2 19a5.2 5.2 0 0 0-8.8-3.8M12 14v7"/></template>
    <template v-else-if="name === 'home'"><path d="m3 11 9-8 9 8v9h-6v-6H9v6H3z"/></template>
    <template v-else-if="name === 'compass'"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></template>
    <template v-else-if="name === 'stack'"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/></template>
    <template v-else-if="name === 'user'"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></template>
    <template v-else-if="name === 'bell'"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></template>
    <template v-else-if="name === 'arrow'"><path d="M5 12h13m-5-5 5 5-5 5"/></template>
    <template v-else-if="name === 'globe'"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9"/></template>
    <template v-else-if="name === 'shield'"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z"/><path d="m9 12 2 2 4-4"/></template>
    <template v-else-if="name === 'copy'"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></template>
    <template v-else-if="name === 'badge'"><circle cx="12" cy="8" r="4"/><path d="M8.6 11.4 7 21l5-3 5 3-1.6-9.6"/></template>
    <template v-else-if="name === 'add-user'"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0m4-9v6m-3-3h6"/></template>
    <template v-else-if="name === 'team'"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20a6 6 0 0 1 12 0m1-6a5 5 0 0 1 5 5"/></template>
    <template v-else-if="name === 'help'"><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.6 2.6 0 1 1 4.4 1.9c-1.2 1-2 1.3-2 3.1m0 3.2v.1"/></template>
    <template v-else-if="name === 'info'"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/></template>
    <template v-else-if="name === 'logout'"><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5m4-4 4-4-4-4m4 4H8"/></template>
    <template v-else-if="name === 'chevron'"><path d="m9 18 6-6-6-6"/></template>
    <template v-else-if="name === 'calendar'"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4m8-4v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01M16 17h.01"/></template>
    <template v-else-if="name === 'hourglass'"><path d="M6 3h12M6 21h12M8 3c0 4 1 5 4 7-3 2-4 3-4 7v4m8-18c0 4-1 5-4 7 3 2 4 3 4 7v4"/></template>
    <template v-else-if="name === 'card'"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18m-14 5h4"/></template>
    <template v-else-if="name === 'withdraw'"><path d="M4 7h12v10H4zM7 11h6m5-8v12m-3-3 3 3 3-3"/></template>
    <template v-else-if="name === 'file'"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6m-6 4h6"/></template>
    <template v-else-if="name === 'upload'"><path d="M12 16V4m-5 5 5-5 5 5M5 13v7h14v-7"/></template>
    <template v-else-if="name === 'download'"><path d="M12 4v12m-5-5 5 5 5-5M5 13v7h14v-7"/></template>
  </svg>
</template>
