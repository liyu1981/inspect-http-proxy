"use client";

import React, { Suspense } from "react";
import { useBottomPanelTabs } from "../bottom-panel-tabs";
import { AppNavSidebar } from "./app-nav-sidebar";
import { BottomPanel } from "./bottom-panel";
import { GlobalAppProvider } from "./global-app-context";

export function BaseLayout({ children }: { children: React.ReactNode }) {
  useBottomPanelTabs();

  return (
    <GlobalAppProvider>
      <div className="h-screen flex bg-background">
        {/* Navigation Sidebar */}
        <Suspense fallback={<div className="w-16 border-r bg-muted/20" />}>
          <AppNavSidebar />
        </Suspense>

        {/* Main Content Area with Bottom Panel */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-auto">{children}</div>

          {/* Bottom Panel */}
          <BottomPanel />
        </div>
      </div>
    </GlobalAppProvider>
  );
}
