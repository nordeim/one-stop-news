"use client";

import React from "react";
import { useState } from "react";
import { Zap, Shield, Clock } from "lucide-react";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("submitting");
    // Simulate subscription
    setTimeout(() => {
      setStatus("success");
      setEmail("");
    }, 1000);
  }

  return (
    <section className="py-16 lg:py-24 bg-ink-900 text-paper-100">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-editorial text-3xl sm:text-4xl text-paper-50 leading-[1.05] mb-4">
            Get Your Daily Briefing
          </h2>
          <p className="text-paper-200/80 mb-8 leading-relaxed">
            Start your day with a concise, AI-summarised briefing of the most
            important stories — delivered straight to your inbox every morning
            at 7 AM.
          </p>

          {status === "success" ? (
            <div className="p-6 bg-dispatch-sage/20 border border-dispatch-sage/30 rounded-sm text-dispatch-sage font-medium">
              <p>Thanks for subscribing! Check your inbox shortly. 🎉</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 mb-8"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="cta-input flex-1 px-4 py-3 rounded-sm font-ui text-sm"
                aria-label="Email address"
                required
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn-ember bg-dispatch-ember text-white px-6 py-3 rounded-sm font-mono text-[11px] font-semibold cat-label tracking-wider uppercase"
              >
                {status === "submitting"
                  ? "Subscribing..."
                  : "Get Daily Briefing"}
              </button>
            </form>
          )}

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-mono text-paper-200/60">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              EU AI Act Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Summarised Every 15 Minutes
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              No Spam, Unsubscribe Anytime
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
