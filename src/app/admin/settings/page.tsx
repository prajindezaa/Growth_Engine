"use client";

import React, { useState } from "react";
import { Settings, Save, CheckCircle2 } from "lucide-react";

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowSignups, setAllowSignups] = useState(true);
  const [enforceOtp, setEnforceOtp] = useState(true);
  const [aiModel, setAiModel] = useState("gemini-3.6-flash");

  const handleSave = () => {
    alert("Platform operational settings saved!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" />
            <span>Platform Global Settings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Control plane flags, AI rate limiters, and system preferences</p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl shadow-sm"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">System Toggles</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-xs font-bold text-white">Enable New User Registrations</div>
              <div className="text-[11px] text-slate-400">Allow new MSMEs to sign up and create stores</div>
            </div>
            <input
              type="checkbox"
              checked={allowSignups}
              onChange={(e) => setAllowSignups(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-xs font-bold text-white">Enforce Email OTP Passwordless Login</div>
              <div className="text-[11px] text-slate-400">Require all users to authenticate via Supabase OTP code</div>
            </div>
            <input
              type="checkbox"
              checked={enforceOtp}
              onChange={(e) => setEnforceOtp(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-800 cursor-pointer">
            <div>
              <div className="text-xs font-bold text-white">Maintenance Mode</div>
              <div className="text-[11px] text-slate-400">Block public traffic and show maintenance banner</div>
            </div>
            <input
              type="checkbox"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
