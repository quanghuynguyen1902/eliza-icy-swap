import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/toaster";
import { BrowserRouter, Route, Routes } from "react-router";
import Chat from "./routes/chat";
import Overview from "./routes/overview";
import Home from "./routes/home";
import useVersion from "./hooks/use-version";
// Import Wagmi dependencies
import { WagmiProvider, http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";

// Create Wagmi configuration
const wagmiConfig = createConfig(
    // @ts-ignore
    getDefaultConfig({
        chains: [baseSepolia],
        transports: {
            [baseSepolia.id]: http(),
        },
        walletConnectProjectId: "1830f624b03c2fc3d99fd758fb040ce0",
        appName: "Icy Swap"
    })
);

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: Number.POSITIVE_INFINITY,
        },
    },
});

function App() {
    useVersion();
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <div
                    className="dark antialiased"
                    style={{
                        colorScheme: "dark",
                    }}
                >
                    <BrowserRouter>
                        <ConnectKitProvider theme="soft">
                            <TooltipProvider delayDuration={0}>
                                <SidebarProvider>
                                    <AppSidebar />
                                    <SidebarInset>
                                        <div className="flex flex-1 flex-col gap-4 size-full container">
                                            <Routes>
                                                <Route path="/" element={<Home />} />
                                                <Route
                                                    path="chat/:agentId"
                                                    element={<Chat />}
                                                />
                                                <Route
                                                    path="settings/:agentId"
                                                    element={<Overview />}
                                                />
                                            </Routes>
                                        </div>
                                    </SidebarInset>
                                </SidebarProvider>
                                <Toaster />
                            </TooltipProvider>
                        </ConnectKitProvider>
                    </BrowserRouter>
                </div>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

export default App;
