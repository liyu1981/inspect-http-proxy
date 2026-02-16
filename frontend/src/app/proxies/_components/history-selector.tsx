"use client";

import { Clock, History, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounced } from "@/app/_hooks/use-debounced";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface HistoryItem {
  id: string;
  created_at: string;
  parsed_config: {
    listen: string;
    target: string;
    truncate_log_body: boolean;
  };
  source_path: string;
}

export function HistorySelector({
  onSelect,
}: {
  onSelect: (item: HistoryItem["parsed_config"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearch] = useDebounced(search, 300);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (debouncedSearch && debouncedSearch.length >= 3) {
          params.append("q", debouncedSearch);
        }
        params.append("limit", "10");

        const res = await api.get(`/api/configs/history?${params.toString()}`);
        setHistory(res.data);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [debouncedSearch]);

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 mb-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Quick Load from History</span>
      </div>
      <div className="relative z-50">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search target URL in history..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4"
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && (history.length > 0 || isLoading) && (
        <div className="absolute z-[60] mt-1 w-full bg-popover text-popover-foreground shadow-md rounded-md border p-1 animate-in fade-in zoom-in-95 max-h-[300px] overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : (
            <>
              {history.map((item) => (
                <button
                  key={item.id}
                  className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground flex flex-col gap-1 transition-colors"
                  onClick={() => {
                    onSelect(item.parsed_config);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-primary font-medium">
                      {item.parsed_config.listen}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{" "}
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground font-mono">
                    {item.parsed_config.target}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
