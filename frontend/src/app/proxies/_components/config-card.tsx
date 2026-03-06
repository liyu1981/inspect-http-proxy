"use client";

import { startOfDay } from "date-fns";
import { useAtom } from "jotai";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Folder,
  Hash,
  List,
  Terminal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useGlobal } from "@/app/_components/global-app-context";
import { JsonEditor } from "@/app/_components/json-editor";
import { pinnedConfigsPersistenceAtom } from "@/app/_jotai/pinned-configs-store";
import { formatConfigDisplayName } from "@/app/history/_components/config-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ProxyConfig } from "@/types";
import { ProxyStatusButton } from "./proxy-status-button";

export function ConfigCard({ config: initialConfig }: { config: ProxyConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { sysConfig } = useGlobal();
  const router = useRouter();
  const [pinnedConfigs, setPinnedConfigs] = useAtom(
    pinnedConfigsPersistenceAtom,
  );

  // Parse the ConfigJSON string inside the component
  const parsedData = useMemo(() => {
    const configJSON = config.config_row.ConfigJSON;
    if (typeof configJSON !== "string") return configJSON;
    try {
      return JSON.parse(configJSON);
    } catch (err) {
      console.error("Failed to parse ConfigJSON for ID:", config.id, err);
      return { error: "Invalid JSON format stored in database" };
    }
  }, [config]);

  // Determine if this proxy is dynamic (not in current toml file)
  const isDynamic = useMemo(() => {
    if (!sysConfig?.proxies || !parsedData) return false;

    const normalize = (s: string) => s?.trim().toLowerCase().replace(/\/$/, "");
    const listen = parsedData.listen || parsedData.Listen;
    const target = parsedData.target || parsedData.Target;

    // Check if any proxy in sysConfig matches this one's listen and target
    return !sysConfig.proxies.some(
      (p: any) =>
        normalize(p.listen || p.Listen) === normalize(listen) &&
        normalize(p.target || p.Target) === normalize(target),
    );
  }, [sysConfig, parsedData]);

  const handleStatusChange = async () => {
    // Refetch the config to get updated status
    try {
      const response = await api.get(`/api/configs/${config.id}`);
      setConfig(response.data);
    } catch (error) {
      console.error("Failed to refresh config:", error);
    }
  };

  const handleMonitor = () => {
    const todayTs = startOfDay(new Date()).getTime();
    const params = {
      config_id: config.id,
      from: todayTs.toString(),
    };

    // Pin the config if not already pinned, or update params if it is
    const existingIndex = pinnedConfigs.findIndex((p) => p.id === config.id);
    if (existingIndex >= 0) {
      const nextPinned = [...pinnedConfigs];
      nextPinned[existingIndex] = { id: config.id, params };
      setPinnedConfigs(nextPinned);
    } else {
      setPinnedConfigs([...pinnedConfigs, { id: config.id, params }]);
    }

    // Navigate to recent traffic page
    const searchParams = new URLSearchParams(params);
    router.push(`/recent?${searchParams.toString()}`);
  };

  return (
    <div className="overflow-hidden">
      <Card
        className={cn(
          "rounded-xl transition-all duration-200",
          isCollapsed ? "pt-0 pb-0 border-none" : "pt-1 px-1",
          isDynamic &&
            "border-amber-200/50 dark:border-amber-900/50 bg-amber-50/10 dark:bg-amber-900/5",
        )}
      >
        <CardHeader
          className={cn(
            "py-6 border text-lg rounded-xl transition-all cursor-pointer select-none",
            isDynamic ? "bg-amber-500/10" : "bg-muted/50",
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-0.5 hover:bg-muted-foreground/10 rounded-md transition-colors">
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              {formatConfigDisplayName(config)}
            </div>
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleMonitor}
                className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                {" "}
                <List className="h-4 w-4" />
                Monitor Recent
              </Button>
              <ProxyStatusButton
                configId={config.id}
                isActive={config.is_proxyserver_active}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>
        </CardHeader>
        {!isCollapsed && (
          <CardContent className="pt-1 space-y-4">
            {isDynamic && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Unsaved Dynamic Proxy</p>
                  <p>
                    This proxy server is running but not yet saved to your
                    configuration file. It will be lost upon restart unless you
                    export.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Config ID
                </p>
                <code className="text-sm font-mono block text-primary font-semibold">
                  {config.id}
                </code>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <Folder className="h-3 w-3" /> Paths
                </p>
                <div className="text-xs space-y-0.5">
                  <p
                    className="truncate font-medium"
                    title={config.config_row.SourcePath}
                  >
                    <span className="text-muted-foreground">SRC:</span>{" "}
                    {config.config_row.SourcePath}
                  </p>
                  <p
                    className="truncate font-medium"
                    title={config.config_row.Cwd}
                  >
                    <span className="text-muted-foreground">CWD:</span>{" "}
                    {config.config_row.Cwd}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Created At
                </p>
                <p className="text-xs font-medium">
                  {new Date(config.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* JSON Viewer */}
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Terminal className="h-3.5 w-3.5" />
                  Config As JSON
                </div>
                {parsedData.error && (
                  <span className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Parse Error
                  </span>
                )}
              </div>
              <div className="rounded-md border bg-muted/50 overflow-hidden">
                <JsonEditor initialJson={parsedData} />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
