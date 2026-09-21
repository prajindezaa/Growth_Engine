"use client";

import { useState } from "react";
import { MOCK_AI_PROPOSALS } from "@/lib/mock-data";
import { AIActionProposal } from "@/types";
import { AIResponsePayload } from "@/types/ai-routes";
import { useAuth } from "@/context/auth-context";
import { voiceController } from "@/lib/speech";

export interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  actionProposal?: AIActionProposal;
  structuredCards?: AIResponsePayload["structuredCards"];
  clarificationOptions?: string[];
  offeredNextStep?: string;
}

export function useAIEmployee() {
  const { business, user, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [proposals, setProposals] = useState<AIActionProposal[]>(MOCK_AI_PROPOSALS);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg_welcome",
      sender: "ai",
      text: "வணக்கம்! I am your GrowthEngine AI Employee. Today you have ₹2,89,600 in total Khata receivables, with ₹1,42,500 overdue from Murugan Traders.",
      timestamp: "Just now",
      offeredNextStep: "Want me to draft a WhatsApp reminder for Murugan Traders?",
      actionProposal: MOCK_AI_PROPOSALS[0],
    },
  ]);

  const sendMessage = async (
    userText: string,
    options?: { isVoice?: boolean; lang?: "ta-IN" | "en-IN" }
  ) => {
    const isVoice = options?.isVoice ?? false;
    const inputLang = options?.lang || (/[\u0B80-\u0BFF]/.test(userText) ? "ta-IN" : "en-IN");

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userText,
          businessId: business?.id,
          userId: user?.id,
          userRole: role || "owner",
        }),
      });

      const data: AIResponsePayload = await res.json();

      let actionProp: AIActionProposal | undefined = undefined;
      if (data.actionProposal) {
        actionProp = {
          id: data.actionProposal.id,
          type: data.actionProposal.type,
          route: data.actionProposal.route,
          title: data.actionProposal.title,
          targetEntity: data.actionProposal.targetEntity,
          what: data.actionProposal.what,
          details: data.actionProposal.details,
          consequences: data.actionProposal.consequences,
          isHighRisk: data.actionProposal.isHighRisk,
          status: "pending",
          auditId: data.actionProposal.auditId,
        };
      }

      const aiMsg: Message = {
        id: `msg_ai_${Date.now()}`,
        sender: "ai",
        text: data.reply || "I have reviewed your business data.",
        timestamp: "Just now",
        actionProposal: actionProp,
        structuredCards: data.structuredCards,
        clarificationOptions: data.clarificationOptions,
        offeredNextStep: data.offeredNextStep,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // If user input was spoken voice, read the response aloud automatically
      if (isVoice && data.reply) {
        voiceController.speak(data.reply, inputLang);
      }
    } catch (err) {
      console.error("Failed to query AI Employee:", err);
      const fallbackAiMsg: Message = {
        id: `msg_ai_${Date.now()}`,
        sender: "ai",
        text: "I am ready to assist with your sales, Khata due, and stock. What would you like to check?",
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, fallbackAiMsg]);
      if (isVoice) {
        voiceController.speak(fallbackAiMsg.text, inputLang);
      }
    } finally {
      setIsThinking(false);
    }
  };

  const confirmAction = async (proposalId: string) => {
    const targetProposal = proposals.find((p) => p.id === proposalId) || 
      messages.find((m) => m.actionProposal?.id === proposalId)?.actionProposal;

    // Send status update to backend for audit logging
    try {
      fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionUpdate: {
            proposalId,
            status: "confirmed",
            route: targetProposal?.route,
            targetEntity: targetProposal?.targetEntity,
          },
        }),
      }).catch(console.warn);
    } catch (e) {
      console.warn("Audit log notify error:", e);
    }

    setProposals((prev) =>
      prev.map((p) => (p.id === proposalId ? { ...p, status: "confirmed" } : p))
    );

    setMessages((prev) =>
      prev.map((m) => {
        if (m.actionProposal && m.actionProposal.id === proposalId) {
          return {
            ...m,
            actionProposal: { ...m.actionProposal, status: "confirmed" },
          };
        }
        return m;
      })
    );
  };

  const cancelAction = async (proposalId: string) => {
    const targetProposal = proposals.find((p) => p.id === proposalId) || 
      messages.find((m) => m.actionProposal?.id === proposalId)?.actionProposal;

    // Send status update to backend for audit logging (logs even when rejected/cancelled)
    try {
      fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionUpdate: {
            proposalId,
            status: "cancelled",
            route: targetProposal?.route,
            targetEntity: targetProposal?.targetEntity,
          },
        }),
      }).catch(console.warn);
    } catch (e) {
      console.warn("Audit log notify error:", e);
    }

    setProposals((prev) =>
      prev.map((p) => (p.id === proposalId ? { ...p, status: "cancelled" } : p))
    );

    setMessages((prev) =>
      prev.map((m) => {
        if (m.actionProposal && m.actionProposal.id === proposalId) {
          return {
            ...m,
            actionProposal: { ...m.actionProposal, status: "cancelled" },
          };
        }
        return m;
      })
    );
  };

  return {
    isOpen,
    setIsOpen,
    isThinking,
    messages,
    sendMessage,
    proposals,
    confirmAction,
    cancelAction,
  };
}

