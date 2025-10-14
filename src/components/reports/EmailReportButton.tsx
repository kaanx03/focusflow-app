"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function EmailReportButton() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSendReport = async () => {
    if (!user) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/send-weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(data.error || "Failed to send report");
      }
    } catch (err: any) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSendReport}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition disabled:opacity-50 text-sm font-medium"
      >
        <Mail size={16} />
        {loading ? "Sending..." : success ? "Email Sent!" : "Email Report"}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
