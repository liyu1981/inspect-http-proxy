"use client";

import { Loader2, Play, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { HistorySelector } from "./history-selector";

export function CreateProxyCard({ onSuccess }: { onSuccess: () => void }) {
	const [isOpen, setIsOpen] = useState(false);
	const [listen, setListen] = useState("");
	const [target, setTarget] = useState("");
	const [truncate, setTruncate] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleCreate = async () => {
		if (!listen || !target) {
			toast.error("Please provide both listen port and target URL");
			return;
		}

		setIsSubmitting(true);
		try {
			await api.post("/api/proxyserver/create", {
				listen,
				target,
				truncate_log_body: truncate,
			});
			toast.success("Proxy server created and started");
			setListen("");
			setTarget("");
			setTruncate(true);
			setIsOpen(false);
			onSuccess();
		} catch (err: any) {
			console.error("Failed to create proxy:", err);
			toast.error(err.response?.data?.error || "Failed to create proxy server");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleHistorySelect = (config: {
		listen: string;
		target: string;
		truncate_log_body: boolean;
	}) => {
		setListen(config.listen);
		setTarget(config.target);
		setTruncate(config.truncate_log_body);
	};

	if (!isOpen) {
		return (
			<Button
				variant="outline"
				className="w-full py-8 border-2 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 text-primary gap-2"
				onClick={() => setIsOpen(true)}
			>
				<Plus className="h-5 w-5" />
				<span className="text-lg font-semibold">Add New Proxy</span>
			</Button>
		);
	}

	return (
		<Card className="border-2 border-primary/20 bg-primary/5 relative">
			<Button
				variant="ghost"
				size="sm"
				className="absolute top-2 right-2 text-muted-foreground"
				onClick={() => setIsOpen(false)}
			>
				<X className="h-4 w-4" />
			</Button>
			<CardHeader className="pb-3">
				<div className="flex items-center gap-2">
					<div className="p-2 rounded-lg bg-primary/10 text-primary">
						<Plus className="h-5 w-5" />
					</div>
					<div>
						<CardTitle className="text-lg">Create New Proxy</CardTitle>
						<CardDescription>
							Launch a temporary proxy server. It won't be saved to config until
							you export.
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				<HistorySelector onSelect={handleHistorySelect} />

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="listen">Listen Address/Port</Label>
						<Input
							id="listen"
							placeholder=":3000 or 127.0.0.1:3000"
							value={listen}
							onChange={(e) => setListen(e.target.value)}
							className="font-mono bg-background"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="target">Target URL</Label>
						<Input
							id="target"
							placeholder="http://localhost:8080"
							value={target}
							onChange={(e) => setTarget(e.target.value)}
							className="font-mono bg-background"
						/>
					</div>
				</div>

				<div className="flex items-center justify-between p-3 rounded-lg bg-background border">
					<div className="space-y-0.5">
						<Label htmlFor="truncate" className="text-sm font-medium">
							Truncate Large Bodies
						</Label>
						<p className="text-xs text-muted-foreground">
							Limit log size for performance
						</p>
					</div>
					<Switch
						id="truncate"
						checked={truncate}
						onCheckedChange={setTruncate}
					/>
				</div>

				<Button
					className="w-full h-11 text-base font-semibold"
					onClick={handleCreate}
					disabled={isSubmitting}
				>
					{isSubmitting ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Play className="mr-2 h-4 w-4" />
					)}
					Save & Start Proxy
				</Button>
			</CardContent>
		</Card>
	);
}
