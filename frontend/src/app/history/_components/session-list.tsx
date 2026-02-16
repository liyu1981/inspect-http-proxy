"use client";

import { format, formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ProxySessionStub } from "@/types";

interface SessionListProps {
  sessions: ProxySessionStub[];
  selectedSessionId: string | null;
  filterMethod: string;
  filterStatus: string;
  searchQuery: string;
  totalLoaded: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onSessionClick: (id: string) => void;
  onFilterMethodChange: (value: string) => void;
  onFilterStatusChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onClearFilters: () => void;
  onLoadMore: () => void;
}

export function SessionList({
  sessions,
  selectedSessionId,
  filterMethod,
  filterStatus,
  searchQuery,
  totalLoaded,
  hasMore,
  isLoadingMore,
  onSessionClick,
  onFilterMethodChange,
  onFilterStatusChange,
  onClearFilters,
  onLoadMore,
}: SessionListProps) {
  // Get unique methods and statuses from loaded sessions
  const availableMethods = React.useMemo(() => {
    const methods = new Set(sessions.map((s) => s.RequestMethod));
    return Array.from(methods).sort();
  }, [sessions]);

  const availableStatuses = React.useMemo(() => {
    const statuses = new Set(
      sessions.map((s) => s.ResponseStatusCode.toString()),
    );
    return Array.from(statuses).sort();
  }, [sessions]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filters Area */}
      <div className="border-b px-6 py-2 flex items-center gap-2 bg-muted/40 flex-shrink-0 justify-end">
        <Select
          value={filterMethod || "all_methods"}
          onValueChange={(val) =>
            onFilterMethodChange(val === "all_methods" ? "" : val)
          }
        >
          <SelectTrigger className="w-[110px] h-8 text-[11px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_methods">All Methods</SelectItem>
            {availableMethods.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterStatus || "all_statuses"}
          onValueChange={(val) =>
            onFilterStatusChange(val === "all_statuses" ? "" : val)
          }
        >
          <SelectTrigger className="w-[100px] h-8 text-[11px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_statuses">All Status</SelectItem>
            {availableStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterMethod || filterStatus || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 ml-auto text-xs"
          >
            Clear
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <Table noWrapper className="border-separate border-spacing-0">
          <TableHeader className="bg-background sticky top-0 z-10">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[80px] sticky top-0 z-20 bg-background shadow-[inset_0_-1px_0_0_#e2e8f0] dark:shadow-[inset_0_-1px_0_0_#1e293b]">
                Status
              </TableHead>
              <TableHead className="w-[80px] sticky top-0 z-20 bg-background shadow-[inset_0_-1px_0_0_#e2e8f0] dark:shadow-[inset_0_-1px_0_0_#1e293b]">
                Method
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-background shadow-[inset_0_-1px_0_0_#e2e8f0] dark:shadow-[inset_0_-1px_0_0_#1e293b]">
                Path
              </TableHead>
              <TableHead className="w-[100px] text-right sticky top-0 z-20 bg-background shadow-[inset_0_-1px_0_0_#e2e8f0] dark:shadow-[inset_0_-1px_0_0_#1e293b]">
                Latency
              </TableHead>
              <TableHead className="w-[140px] text-right sticky top-0 z-20 bg-background shadow-[inset_0_-1px_0_0_#e2e8f0] dark:shadow-[inset_0_-1px_0_0_#1e293b]">
                Time
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions?.map((session) => (
              <SessionRow
                key={session.ID}
                session={session}
                isSelected={selectedSessionId === session.ID}
                onClick={() => onSessionClick(session.ID)}
              />
            ))}
            {!sessions?.length && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center border-b">
                  No sessions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Area */}
      <div className="border-t px-4 py-3 bg-background flex items-center justify-between flex-shrink-0">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalLoaded}</span>{" "}
          session{totalLoaded !== 1 ? "s" : ""} loaded
        </div>

        {hasMore && (
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="h-8 gap-2"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        )}

        {!hasMore && totalLoaded > 0 && (
          <span className="text-xs text-muted-foreground">
            All sessions loaded
          </span>
        )}
      </div>
    </div>
  );
}

function SessionRow({
  session,
  isSelected,
  onClick,
}: {
  session: ProxySessionStub;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <TableRow
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted",
      )}
      onClick={onClick}
    >
      <TableCell className="py-2 border-b">
        <StatusBadge code={session.ResponseStatusCode} />
      </TableCell>
      <TableCell className="py-2 border-b">
        <span className="font-mono font-bold text-[11px] uppercase">
          {session.RequestMethod}
        </span>
      </TableCell>
      <TableCell className="py-2 border-b">
        <div
          className="max-w-[300px] truncate font-mono text-[11px] text-muted-foreground"
          title={session.RequestPath}
        >
          {session.RequestPath}
        </div>
      </TableCell>
      <TableCell className="py-2 text-right text-[11px] font-mono text-muted-foreground border-b">
        {session.DurationMs > 0 ? `${session.DurationMs}ms` : "-"}
      </TableCell>
      <TableCell className="py-2 text-right text-xs text-muted-foreground whitespace-nowrap border-b">
        <div className="font-medium text-foreground">
          {formatDistanceToNow(new Date(session.Timestamp), {
            addSuffix: true,
          })}
        </div>
        <div className="text-[10px] opacity-70">
          {format(new Date(session.Timestamp), "MM-dd HH:mm:ss")}
        </div>
      </TableCell>
    </TableRow>
  );
}

function StatusBadge({ code }: { code: number }) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let className = "";

  if (code === 0) {
    variant = "outline";
    return (
      <Badge variant={variant} className="animate-pulse">
        Pending
      </Badge>
    );
  }

  if (code >= 200 && code < 300) {
    variant = "secondary";
    className =
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200";
  } else if (code >= 300 && code < 400) {
    variant = "secondary";
    className =
      "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 border-blue-200";
  } else if (code >= 400) {
    variant = "destructive";
  }

  return (
    <Badge
      variant={variant}
      className={cn("font-mono text-[10px] px-1.5 h-5", className)}
    >
      {code}
    </Badge>
  );
}
