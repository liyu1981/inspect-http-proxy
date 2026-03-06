"use client";

import { format, startOfDay, subHours, subMinutes, subWeeks } from "date-fns";
import { Clock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetcher } from "@/lib/api";
import type { ProxySessionStub } from "@/types";
import { AppContainer } from "../_components/app-container";
import { AppHeader } from "../_components/app-header";
import { useGlobal } from "../_components/global-app-context";
import { ConfigProvider } from "../history/_components/config-provider";
import { formatConfigDisplayName } from "../history/_components/config-selector";
import { NoConfigsState } from "../history/_components/no-configs-state";
import { WithConfigsRecent } from "./_components/with-configs-recent";

function RecentPageContent() {
  const { allConfigs } = useGlobal();
  const router = useRouter();
  const searchParams = useSearchParams();

  const configId = searchParams.get("config_id") || "";
  const fromParam = searchParams.get("from");

  const selectedConfig = React.useMemo(() => {
    return (
      allConfigs.find((c) => c.config_row.ID === configId) ||
      allConfigs.find((c) => c.is_proxyserver_active) ||
      allConfigs[0]
    );
  }, [allConfigs, configId]);

  const startTime = React.useMemo(() => {
    if (fromParam) {
      const ts = Number.parseInt(fromParam);
      if (!Number.isNaN(ts)) return ts;
    }
    // Default to today (start of day)
    return startOfDay(new Date()).getTime();
  }, [fromParam]);

  // Update URL if configId or from is missing
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (!configId && selectedConfig) {
      params.set("config_id", selectedConfig.config_row.ID);
      changed = true;
    }

    if (!fromParam) {
      params.set("from", startTime.toString());
      changed = true;
    }

    if (changed) {
      router.replace(`/recent?${params.toString()}`);
    }
  }, [configId, selectedConfig, searchParams, router, fromParam, startTime]);

  // Filter and Search States
  const [filterMethod, setFilterMethod] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("");

  const initLoadSessions = React.useCallback(
    async (configId: string, params: URLSearchParams) => {
      const startTimeIso = new Date(startTime).toISOString();
      const queryParams = new URLSearchParams(params);
      queryParams.set("since", startTimeIso);

      const url = `/api/sessions/recent/${configId}?${queryParams.toString()}`;
      const res = await fetcher(url);
      return res;
    },
    [startTime],
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

  const setTimeRange = (range: "30m" | "1h" | "today" | "1w") => {
    let newFrom: number;
    const now = new Date();
    switch (range) {
      case "30m":
        newFrom = subMinutes(now, 30).getTime();
        break;
      case "1h":
        newFrom = subHours(now, 1).getTime();
        break;
      case "today":
        newFrom = startOfDay(now).getTime();
        break;
      case "1w":
        newFrom = subWeeks(now, 1).getTime();
        break;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("from", newFrom.toString());
    router.push(`/recent?${params.toString()}`);
  };

  const getTimeRangeLabel = () => {
    const diff = Date.now() - startTime;
    const mins = diff / (1000 * 60);
    const hours = mins / 60;
    const days = hours / 24;

    if (startTime === startOfDay(new Date()).getTime()) return "Today";
    if (Math.abs(mins - 30) < 1) return "Past 30 mins";
    if (Math.abs(hours - 1) < 0.1) return "Past 1 hour";
    if (Math.abs(days - 7) < 0.1) return "Past Week";

    return format(new Date(startTime), "PP pp");
  };

  if (allConfigs.length === 0) {
    return (
      <AppContainer>
        <AppHeader>
          <h1 className="text-xl font-bold tracking-tight text-primary">
            Recent Traffic
          </h1>
        </AppHeader>
        <NoConfigsState />
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      <AppHeader>
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-primary">
              Recent Traffic:
            </h1>
            <span className="text-lg font-medium text-muted-foreground">
              {selectedConfig ? formatConfigDisplayName(selectedConfig) : ""}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Clock className="w-4 h-4" />
                Showing: {getTimeRangeLabel()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setTimeRange("30m")}>
                Past 30 mins
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange("1h")}>
                Past 1 hour
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange("today")}>
                Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange("1w")}>
                Past Week
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </AppHeader>

      <div className="flex-1 overflow-hidden">
        {selectedConfig && (
          <WithConfigsRecent
            key={`${selectedConfig.config_row.ID}-${startTime}`}
            configId={selectedConfig.config_row.ID}
            searchQuery={""}
            filterMethod={filterMethod}
            filterStatus={filterStatus}
            onSearchQueryChange={() => {}}
            onFilterMethodChange={setFilterMethod}
            onFilterStatusChange={setFilterStatus}
            initLoadSessions={initLoadSessions}
            mergeSessions={mergeSessions}
          />
        )}
      </div>
    </AppContainer>
  );
}

export default function RecentPage() {
  return (
    <Suspense fallback={null}>
      <ConfigProvider mode="recent">
        <RecentPageContent />
      </ConfigProvider>
    </Suspense>
  );
}
