"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/config";

interface EmergencyContact {
  country: string;
  number: string;
  description: string;
}

const FALLBACK_CONTACTS: EmergencyContact[] = [
  { country: "United States", number: "911", description: "Police, Fire & Medical" },
  { country: "United Kingdom", number: "999", description: "Police, Fire & Medical" },
  { country: "European Union", number: "112", description: "Universal Emergency Number" },
  { country: "United States", number: "1-800-222-1222", description: "Poison Control Center" },
  { country: "India", number: "108", description: "Ambulance & Emergency" },
  { country: "Australia", number: "000", description: "Triple Zero Emergency" },
  { country: "Canada", number: "911", description: "Police, Fire & Medical" },
  { country: "International", number: "112", description: "GSM Mobile Emergency" },
];

export default function EmergencyContactsPage() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContacts() {
      try {
        const res = await fetch(`${API_BASE}/emergency/contacts`);
        if (!res.ok) throw new Error("Failed to fetch emergency contacts");
        const data = await res.json();
        setContacts(data.contacts ?? data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setContacts(FALLBACK_CONTACTS);
      } finally {
        setLoading(false);
      }
    }
    fetchContacts();
  }, []);

  function handleCall(number: string) {
    window.location.assign(`tel:${number}`);
  }

  return (
    <div className="page-wrap p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl backdrop-blur-sm" style={{ background: "rgba(239,68,68,0.2)" }}>
              <i className="fa-solid fa-triangle-exclamation text-2xl" style={{ color: "#EF4444" }} />
            </span>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--text)" }}>
              Emergency Contacts
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Important numbers to keep you safe
          </p>
        </div>

        <div className="mb-10 overflow-hidden rounded-2xl p-5 backdrop-blur-md sm:flex sm:items-center sm:gap-4" style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)" }}>
          <span className="mb-3 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:mb-0" style={{ background: "rgba(239,68,68,0.2)" }}>
            <i className="fa-solid fa-phone-volume text-xl" style={{ color: "#EF4444" }} />
          </span>
          <div>
            <p className="text-base font-semibold" style={{ color: "#FCA5A5" }}>
              In case of emergency, call your local emergency number immediately.
            </p>
            <p className="mt-1 text-sm" style={{ color: "rgba(252,165,165,0.7)" }}>
              Do not rely solely on this app for life-threatening situations.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-20">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "#EF4444", borderTopColor: "transparent" }} />
            <p className="text-sm text-muted">Loading emergency contacts…</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl p-4 text-center backdrop-blur-sm" style={{ border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)" }}>
            <p className="text-sm" style={{ color: "#FCD34D" }}>
              <i className="fa-solid fa-circle-info mr-2" />
              Could not reach the server. Showing default contacts.
            </p>
          </div>
        )}

        {!loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact, idx) => (
              <div
                key={`${contact.country}-${contact.number}-${idx}`}
                className="group relative overflow-hidden rounded-2xl p-6 shadow-lg backdrop-blur-md transition-all duration-300"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; e.currentTarget.style.background = "var(--surface-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
              >
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full transition-all duration-300 group-hover:scale-150" style={{ background: "rgba(239,68,68,0.05)" }} />

                <div className="relative mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300" style={{ background: "rgba(239,68,68,0.15)" }}>
                    <i className="fa-solid fa-headset text-lg" style={{ color: "#EF4444" }} />
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    {contact.country}
                  </span>
                </div>

                <p className="relative mb-1 text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                  {contact.number}
                </p>
                <p className="relative mb-6 text-sm text-muted">
                  {contact.description}
                </p>

                <button
                  onClick={() => handleCall(contact.number)}
                  className="relative flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.97]"
                  style={{ background: "#DC2626", boxShadow: "0 4px 16px rgba(220,38,38,0.25)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#EF4444"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(239,68,68,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#DC2626"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(220,38,38,0.25)"; }}
                >
                  <i className="fa-solid fa-phone text-xs" />
                  Call Now
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && contacts.length === 0 && !error && (
          <div className="py-20 text-center">
            <i className="fa-solid fa-address-book mb-4 text-4xl text-dim" />
            <p className="text-muted">No emergency contacts available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
