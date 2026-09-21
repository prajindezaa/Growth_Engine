"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailPanel } from "@/components/ui/detail-panel";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import {
  Bot,
  Plus,
  Zap,
  CheckCircle2,
  Clock,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  AlertTriangle,
  FileText,
} from "lucide-react";

interface AutomationRule {
  id: string;
  title: string;
  trigger: string;
  action: string;
  channel: "whatsapp" | "email" | "notification" | "system";
  enabled: boolean;
  executionsCount: number;
  lastExecuted: string;
}

export default function AutomationsPage() {
  const { business } = useAuth();
  const { success, error } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [trigger, setTrigger] = useState("");
  const [action, setAction] = useState("");

  const loadRules = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from("automation_rules").select("*").order("created_at");
      if (business?.id) {
        query = query.eq("business_id", business.id);
      }
      const { data, error: dbErr } = await query;
      if (data && data.length > 0) {
        setRules(
          data.map((r) => ({
            id: r.id,
            title: r.title,
            trigger: r.trigger,
            action: r.action,
            channel: r.channel || "whatsapp",
            enabled: r.enabled ?? true,
            executionsCount: r.executions_count || 0,
            lastExecuted: r.last_executed ? new Date(r.last_executed).toLocaleDateString("en-IN") : "Never",
          }))
        );
      } else if (business?.id) {
        // Seed default rules into Supabase
        const defaultRules = [
          {
            business_id: business.id,
            title: "Auto WhatsApp Payment Reminder on Due Date",
            trigger: "When Khata invoice crosses due date by 1 day",
            action: "Send polite reminder with UPI QR payment link to customer WhatsApp",
            channel: "whatsapp",
            enabled: true,
            executions_count: 48,
          },
          {
            business_id: business.id,
            title: "Low Stock Alert & Draft Purchase Order",
            trigger: "When any item stock falls below minStockAlert",
            action: "Notify owner & prompt AI Employee to draft restock PO",
            channel: "system",
            enabled: true,
            executions_count: 12,
          },
          {
            business_id: business.id,
            title: "Daily Evening Sales & Cash Register Summary",
            trigger: "Every evening at 09:00 PM",
            action: "Send consolidated daily sales, collections & cash summary to Owner's WhatsApp",
            channel: "whatsapp",
            enabled: true,
            executions_count: 140,
          },
        ];
        const { data: inserted } = await supabase.from("automation_rules").insert(defaultRules).select();
        if (inserted) {
          setRules(
            inserted.map((r) => ({
              id: r.id,
              title: r.title,
              trigger: r.trigger,
              action: r.action,
              channel: r.channel || "whatsapp",
              enabled: r.enabled ?? true,
              executionsCount: r.executions_count || 0,
              lastExecuted: "Never",
            }))
          );
        }
      }
    } catch (e) {
      console.warn("Error loading automation rules:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [business?.id]);

  const toggleRule = async (id: string) => {
    const current = rules.find((r) => r.id === id);
    if (!current) return;
    const nextState = !current.enabled;

    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: nextState } : r))
    );

    try {
      await supabase
        .from("automation_rules")
        .update({ enabled: nextState })
        .eq("id", id);
      success(`Rule "${current.title}" ${nextState ? "Enabled" : "Paused"}`);
    } catch (e) {
      console.warn("Error updating automation rule:", e);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !trigger || !action) return;

    const tempId = `rule_${Date.now()}`;
    const newRule: AutomationRule = {
      id: tempId,
      title,
      trigger,
      action,
      channel: "whatsapp",
      enabled: true,
      executionsCount: 0,
      lastExecuted: "Never",
    };

    setRules([newRule, ...rules]);

    try {
      const { data } = await supabase.from("automation_rules").insert({
        ...(business?.id && { business_id: business.id }),
        title,
        trigger,
        action,
        channel: "whatsapp",
        enabled: true,
      }).select().single();

      if (data) {
        setRules((prev) => prev.map((r) => (r.id === tempId ? { ...r, id: data.id } : r)));
      }
      success(`Automation rule "${title}" configured`);
      setIsAddOpen(false);
      setTitle("");
      setTrigger("");
      setAction("");
    } catch (e) {
      console.warn("Error inserting automation rule:", e);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Workflow Automations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Automated WhatsApp payment reminders, daily summaries, and stock triggers
          </p>
        </div>

        <Button onClick={() => setIsAddOpen(true)} className="self-start sm:self-auto font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          <span>New Rule</span>
        </Button>
      </div>

      {/* Rules Grid */}
      <div className="space-y-3.5">
        {rules.map((rule) => (
          <Card key={rule.id} className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    rule.enabled ? "bg-indigo-50 text-[#4F46E5]" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {rule.title}
                    </h3>
                    <Badge variant={rule.enabled ? "success" : "neutral"}>
                      {rule.enabled ? "Active" : "Paused"}
                    </Badge>
                  </div>

                  <div className="mt-2.5 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <strong className="text-slate-900 font-medium">When: </strong>
                      <span>{rule.trigger}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <strong className="text-slate-900 font-medium">Then: </strong>
                      <span>{rule.action}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => toggleRule(rule.id)}
                className="text-slate-500 hover:text-slate-900 active:scale-95 transition-all p-1"
                aria-label="Toggle automation"
              >
                {rule.enabled ? (
                  <ToggleRight className="w-8 h-8 text-[#4F46E5]" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-300" />
                )}
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Executed {rule.executionsCount} times</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Last run: {rule.lastExecuted}</span>
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Rule Drawer */}
      <DetailPanel
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Configure Automation Rule"
        subtitle="Set event triggers and automated actions"
        footerActions={
          <div className="flex items-center gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleCreateRule}>
              Save Rule
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <Input
            label="Rule Name *"
            placeholder="e.g. Overdue payment reminder at 10 AM"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label="Trigger Event (When) *"
            placeholder="e.g. Invoice due date + 2 days"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            required
          />
          <Input
            label="Action to Execute (Then) *"
            placeholder="e.g. Send WhatsApp reminder with QR link"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            required
          />
        </form>
      </DetailPanel>

    </div>
  );
}
