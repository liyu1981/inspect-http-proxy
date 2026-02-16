"use client";

import { RefreshCw, Search } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetcher } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ProxySessionStub } from "@/types";
import { AppContainer } from "../_components/app-container";
import { AppHeader } from "../_components/app-header";
import { useGlobal } from "../_components/global-app-context";
import { ConfigProvider, useConfig } from "./_components/config-provider";
import { ConfigSelector } from "./_components/config-selector";
import { NoConfigsState } from "./_components/no-configs-state";
import { WithConfigsHistory } from "./_components/with-configs-history";

function InspectPageContent() {
  const { allConfigs } = useGlobal();
  const { selectedConfigId, setSelectedConfigId } = useConfig();
  const [mutateFunc, setMutateFunc] = React.useState<(() => void) | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);

  // Filter and Search States
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterMethod, setFilterMethod] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("");

  const initLoadSessions = React.useCallback(
    async (configId: string, params: URLSearchParams) => {
      const q = params.get("q");
      const apiPath =
        q && q.length >= 3
          ? `/api/sessions/search/${configId}`
          : `/api/sessions/recent/${configId}`;
      return fetcher(`${apiPath}?${params.toString()}`);
    },
    [],
  );

  const mergeSessions = React.useCallback(
    (prev: ProxySessionStub[], session: ProxySessionStub) => {
      const existingIndex = prev.findIndex((s) => s.ID === session.ID);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = session;
        return updated;
      }
      return [session, ...prev];
    },
    [],
  );

  const handleMutate = React.useCallback((fn: () => void) => {
    setMutateFunc(() => fn);
  }, []);

  const handleRefresh = () => {
    if (mutateFunc) {
      mutateFunc();
    }
  };

  const headTitle = "History Traffic";

  // Show no configs state if no configs available
  if (allConfigs.length === 0) {
    return (
      <AppContainer>
        <AppHeader>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{headTitle}</h1>
          </div>
        </AppHeader>
        <NoConfigsState />
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      {/* Header */}
      <AppHeader>
        <div className="flex items-center gap-4 flex-1">
          <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">
            {headTitle}
          </h1>
          <ConfigSelector
            configs={allConfigs}
            selectedConfigId={selectedConfigId}
            onConfigChange={setSelectedConfigId}
          />
          <div className="relative max-w-md w-full ml-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search (3+ chars)..."
              className="pl-8 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={!mutateFunc}
              >
                <RefreshCw
                  className={cn("h-4 w-4", isValidating && "animate-spin")}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Manual Refresh Sessions Now</TooltipContent>
          </Tooltip>
        </div>
      </AppHeader>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <WithConfigsHistory
          configId={selectedConfigId}
          onMutate={handleMutate}
          onValidatingChange={setIsValidating}
          searchQuery={searchQuery}
          filterMethod={filterMethod}
          filterStatus={filterStatus}
          onSearchQueryChange={setSearchQuery}
          onFilterMethodChange={setFilterMethod}
          onFilterStatusChange={setFilterStatus}
          initLoadSessions={initLoadSessions}
          mergeSessions={mergeSessions}
        />
      </div>
    </AppContainer>
  );
}

export default function InspectPage() {
  return (
    <ConfigProvider mode="history">
      <InspectPageContent />
    </ConfigProvider>
  );
}
