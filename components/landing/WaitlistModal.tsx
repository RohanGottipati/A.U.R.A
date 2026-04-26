"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useModal } from "@/context/ModalContext";
import { ArrowRight, Check, X } from "lucide-react";

export default function WaitlistModal() {
  const { open, closeModal } = useModal();
  const isOpen = open === "waitlist";
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setEmail("");
      setRole("");
      closeModal();
    }, 2400);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && closeModal()}>
      <DialogContent
        className="bg-[#0a0a0f] border border-[#1a1a26] text-white max-w-md p-0 overflow-hidden"
      >
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 z-10 text-white/40 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="px-6 pt-5 pb-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-[#00f0ff]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] blink" />
            FLR // ACCESS REQUEST
          </div>
          <span className="font-mono text-[10px] tracking-[0.3em] text-white/30">v0.4.1</span>
        </div>

        <DialogHeader className="px-6 pt-6 pb-2 text-left">
          <DialogTitle className="font-heading text-2xl tracking-tight text-white">
            {submitted ? "You're on the list." : "Generate a Simulation"}
          </DialogTitle>
          <p className="text-sm text-white/55 mt-1">
            {submitted
              ? "We'll reach out with simulation access shortly."
              : "Early access opens in waves. Tell us about your space."}
          </p>
        </DialogHeader>

        {submitted ? (
          <div className="px-6 py-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-[#00ffaa]/40 bg-[#00ffaa]/5 flex items-center justify-center mb-4">
              <Check className="w-5 h-5 text-[#00ffaa]" />
            </div>
            <p className="font-mono text-[11px] tracking-[0.3em] text-[#00ffaa]">
              QUEUED · {email.slice(0, 24)}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 pt-4 pb-6 space-y-5">
            <Field
              label="EMAIL"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="you@studio.com"
              required
            />
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-white/40 mb-2">YOUR SPACE</div>
              <div className="grid grid-cols-2 gap-2">
                {["Event/Festival", "Hospital", "Warehouse", "Other"].map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRole(r)}
                    className={`text-left text-xs font-mono tracking-wider px-3 py-2 rounded border transition ${
                      role === r
                        ? "border-[#00f0ff] bg-[#00f0ff]/5 text-white"
                        : "border-white/10 text-white/55 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!email}
              className="cta-primary w-full px-5 py-3 rounded font-mono text-xs tracking-[0.28em] uppercase flex items-center justify-center gap-2 disabled:opacity-40"
            >
              Request Access
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <p className="text-[10px] font-mono tracking-[0.18em] text-white/25 text-center">
              By requesting access you agree to receive simulation updates.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.3em] text-white/40 mb-2">{label}</div>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-transparent border-0 border-b border-white/10 focus:border-[#00f0ff] outline-none py-2 text-white placeholder:text-white/25 font-mono text-sm transition"
      />
    </div>
  );
}
