"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { FollowerRecord } from "@/lib/extension-protocol";
import { cn } from "@/lib/utils";

interface RelationshipCardProps {
  description: string;
  records: FollowerRecord[];
  title: string;
  tone: "cool" | "fool";
}

export function RelationshipCard({
  description,
  records,
  title,
  tone,
}: RelationshipCardProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const filteredRecords = useMemo(() => {
    if (!deferredQuery) return records;
    return records.filter((record) => record.username.includes(deferredQuery));
  }, [deferredQuery, records]);

  return (
    <Card tone={tone} className="min-h-[36rem] min-w-0">
      <CardHeader className="flex flex-col gap-3">
        <CardTitle
          className={cn(
            "text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl",
            tone === "cool" ? "text-cool-strong" : "text-fool-strong",
          )}
        >
          {title}
        </CardTitle>
        <CardDescription className="text-base font-semibold text-foreground">
          {description}
        </CardDescription>
        <p
          className={cn(
            "font-mono text-5xl font-medium tracking-[-0.08em] sm:text-6xl",
            tone === "cool" ? "text-cool-strong" : "text-fool-strong",
          )}
        >
          {records.length.toLocaleString()}
        </p>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-6">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="search followers"
          aria-label={"search " + (tone === "cool" ? "cools" : "fools")}
          autoComplete="off"
          spellCheck={false}
        />

        <div
          className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto overscroll-contain pr-2"
          aria-live="polite"
        >
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record) => (
              <a
                key={record.username}
                href={record.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="result-row w-fit rounded-lg px-2 py-1 text-base font-semibold tracking-[-0.02em] text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-4 focus-visible:ring-ring/20"
              >
                {record.username}
              </a>
            ))
          ) : (
            <p className="px-2 py-1 text-muted-foreground">no matches</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
