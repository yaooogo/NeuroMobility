import { createAppKit } from "@reown/appkit/vue";
import { bsc, bscTestnet } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

export const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || "d30f31aa6bda06cc9ffa48913aea55df";
export const activeNetwork = import.meta.env.VITE_CHAIN_ENV === "prod" ? bsc : bscTestnet;

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [activeNetwork]
});

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [activeNetwork],
  metadata: {
    name: "NEURO Mobility",
    description: "NEURO smart mobility investment platform",
    url: import.meta.env.VITE_APP_URL || window.location.origin,
    icons: []
  },
  features: {
    analytics: false,
    socials: []
  }
});
