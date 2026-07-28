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
    window.location.href = `tel:${number}`;
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--bg)",
        backgroundImage: "var(--bg-gradient)",
      }}
    >
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 backdrop-blur-sm">
              <i className="fa-solid fa-triangle-exclamation text-2xl text-red-400" />
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Emergency Contacts
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Important numbers to keep you safe
          </p>
        </div>

        <div className="mb-10 overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/10 p-5 backdrop-blur-md sm:flex sm:items-center sm:gap-4">
          <span className="mb-3 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/20 sm:mb-0">
            <i className="fa-solid fa-phone-volume text-xl text-red-400" />
          </span>
          <div>
            <p className="text-base font-semibold text-red-300">
              In case of emergency, call your local emergency number immediately.
            </p>
            <p className="mt-1 text-sm text-red-400/70">
              Do not rely solely on this app for life-threatening situations.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-20">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
            <p className="text-sm text-gray-400">Loading emergency contacts…</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center backdrop-blur-sm">
            <p className="text-sm text-amber-300">
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
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-red-500/40 hover:bg-white/[0.07] hover:shadow-red-500/10"
              >
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-500/5 transition-all duration-300 group-hover:scale-150 group-hover:bg-red-500/10" />

                <div className="relative mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400 transition-colors duration-300 group-hover:bg-red-500/25">
                    <i className="fa-solid fa-headset text-lg" />
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    {contact.country}
                  </span>
                </div>

                <p className="relative mb-1 text-2xl font-bold tracking-tight text-white">
                  {contact.number}
                </p>
                <p className="relative mb-6 text-sm text-gray-400">
                  {contact.description}
                </p>

                <button
                  onClick={() => handleCall(contact.number)}
                  className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-all duration-200 hover:bg-red-500 hover:shadow-red-500/30 active:scale-[0.97]"
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
            <i className="fa-solid fa-address-book mb-4 text-4xl text-gray-600" />
            <p className="text-gray-500">No emergency contacts available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
