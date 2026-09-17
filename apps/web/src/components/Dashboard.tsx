"use client";

import { useEffect, useState, useMemo } from "react";
import type { ServiceRecord } from "@apihunter/db";
import FilterBar, { type FilterState } from "@/components/FilterBar";
import ServiceTable from "@/components/ServiceTable";
import ServiceCard from "@/components/ServiceCard";
import EmptyState from "@/components/EmptyState";
import { Radar, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type ApiResponse = { services?: ServiceRecord[]; error?: string };

export default function Dashboard() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterState>({
    search: "",
    category: "",
    status: "",
  });
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // بحث مع تأخير قصير (debounce) لتقليل الطلبات
  useEffect(() => {
    setLoading(true);
    const t2 = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (filter.search) params.set("search", filter.search);
        if (filter.category) params.set("category", filter.category);
        if (filter.status) params.set("status", filter.status);

        const res = await fetch(`/api/services?${params.toString()}`);
        const data: ApiResponse = await res.json();
        if (!res.ok) throw new Error(data.error ?? t("dashboard.unknownError"));
        setServices(data.services ?? []);
        setError("");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t2);
  }, [filter]);

  const counter = useMemo(() => services.length, [services]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12" id="services">
      {/* عنوان القسم */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-black text-white sm:text-3xl">
            <Radar className="h-7 w-7 text-primary" />
            {t("dashboard.title")}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <span className="badge bg-white/5 text-slate-300 ring-1 ring-white/15">
          <Clock className="h-3.5 w-3.5" />
          {t("dashboard.counter")}
        </span>
      </div>

      <FilterBar filter={filter} onChange={setFilter} />

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl border border-white/5 bg-night-800/60"
              />
            ))}
          </div>
        ) : error ? (
          <div className="card-surface border-danger/30 p-8 text-center text-danger">
            {t("dashboard.fetchError")}: {error}
          </div>
        ) : services.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ServiceTable services={services} />
            <div className="space-y-4 md:hidden">
              {services.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
