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

export default function EmergencyPage() {
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
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl backdrop-blur-sm" style={{ background: "hsl(0 84% 60% / 0.2)" }}>
              <svg className="h-6 w-6" viewBox="0 0 512 512" fill="#EF4444" aria-hidden="true">
                <path d="M256 32c14.2 0 27.3 7.5 33.8 19.3l198.4 350.5c6.6 11.7 6.6 26.2 0 37.9S466.7 448 453 448H59c-13.7 0-26.3-7.5-33.2-19.3s-6.6-26.2 0-37.9L222.2 51.3c6.5-11.8 19.6-19.3 33.8-19.3zm0 112c-13.3 0-24 10.7-24 24v88c0 13.3 10.7 24 24 24s24-10.7 24-24V168c0-13.3-10.7-24-24-24zm-32 224a32 32 0 1 0 64 0 32 32 0 1 0-64 0z" />
              </svg>
            </span>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "hsl(var(--foreground))" }}>
              Emergency Contacts
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Important numbers to keep you safe
          </p>
        </div>

        <div className="mb-10 overflow-hidden rounded-2xl p-5 backdrop-blur-md sm:flex sm:items-center sm:gap-4" style={{ border: "1px solid hsl(0 84% 60% / 0.3)", background: "hsl(0 84% 60% / 0.1)" }}>
          <span className="mb-3 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:mb-0" style={{ background: "hsl(0 84% 60% / 0.2)" }}>
            <svg className="h-5 w-5" viewBox="0 0 512 512" fill="#EF4444" aria-hidden="true">
              <path d="M280 0C408.1 0 512 103.9 512 232c0 13.3-10.7 24-24 24s-24-10.7-24-24c0-101.6-82.4-184-184-184c-13.3 0-24-10.7-24-24s10.7-24 24-24zm8 192a32 32 0 1 1 0 64 8.2 8.2 0 0 1-8-8.1c0-4.3 2.1-8.7 5.2-11.8c3-3.1 7.1-5.1 11.5-5.9 2.8-.5 5.6-.2 8.1 .2V192zM278.9 97.4c-8.5-4-12.8-14-9-22.5s14.1-12.6 22.6-8.8c33.5 16 61.7 44.2 77.7 77.7 3.9 8.4 .1 18.4-8.3 22.3s-18.5 .1-22.4-8.3c-12.1-25.7-33.3-46.8-58.9-58.9-8.5-4.1-12.7-14.1-8.7-22.5zM164.9 35.9c11.4-6.8 26-4 32.1 8.5l26.4 53.2c5.7 11.6 3.1 25.7-6.4 34.3l-40.2 36.8c-6.6 6-6.4 16.2 .4 22.5 18.3 17.1 39.8 32.7 64 46.1 23.7 13.2 48.7 23.2 74.5 30.1 10.4 2.8 21.4-.2 28.9-7.8l30-27.5c10.4-10.4 27.3-11.7 39.4-3.1l59.1 41.9c12.6 8.9 15.2 26.8 5.6 39.1l-37.3 47.8c-9.9 12.7-25.8 19.6-43 18.2C187.1 349.1 89.7 276.5 55 170.9c-5.4-16.4-1.2-34.5 11.1-47.1L146 60.7c5.6-5.6 12.4-9.5 20.2-11.8 7.6-2.3 15.7-2.3 23.2 0l-24.3-13z" />
            </svg>
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
              <svg className="mr-2 inline-block h-4 w-4" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
                <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z" />
              </svg>
              Could not reach the server. Showing default contacts.
            </p>
          </div>
        )}

        {!loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact, idx) => (
              <div
                key={`${contact.country}-${contact.number}-${idx}`}
                className="group relative overflow-hidden rounded-2xl p-6 shadow-lg backdrop-blur-md transition-all duration-300 bg-card border-border hover:border-[hsl(0_84%_60%/0.4)] hover:bg-muted"
              >
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full transition-all duration-300 group-hover:scale-150" style={{ background: "hsl(0 84% 60% / 0.05)" }} />

                <div className="relative mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300" style={{ background: "hsl(0 84% 60% / 0.15)" }}>
                    <svg className="h-5 w-5" viewBox="0 0 512 512" fill="#EF4444" aria-hidden="true">
                      <path d="M256 48C141.1 48 48 141.1 48 256v40c0 13.3-10.7 24-24 24s-24-10.7-24-24V256C0 114.6 114.6 0 256 0S512 114.6 512 256v40c0 13.3-10.7 24-24 24s-24-10.7-24-24V256c0-114.9-93.1-208-208-208zM144 288h-8c-30.9 0-56 25.1-56 56v32c0 30.9 25.1 56 56 56h8c26.5 0 48-21.5 48-48V336c0-26.5-21.5-48-48-48zm280 56v32c0 30.9-25.1 56-56 56h-8c-26.5 0-48-21.5-48-48V336c0-26.5 21.5-48 48-48h8c30.9 0 56 25.1 56 56zm-48-24c-13.3 0-24 10.7-24 24v32c0 13.3 10.7 24 24 24s24-10.7 24-24V320c0-13.3-10.7-24-24-24zm-208 0c-13.3 0-24 10.7-24 24v32c0 13.3 10.7 24 24 24s24-10.7 24-24V320c0-13.3-10.7-24-24-24z" />
                    </svg>
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    {contact.country}
                  </span>
                </div>

                <p className="relative mb-1 text-2xl font-bold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
                  {contact.number}
                </p>
                <p className="relative mb-6 text-sm text-muted">
                  {contact.description}
                </p>

                <button
                  onClick={() => handleCall(contact.number)}
                  className="relative flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.97] hover:bg-[#EF4444] hover:shadow-[0_6px_24px_rgba(239,68,68,0.3)]"
                  style={{ background: "#DC2626" }}
                >
                  <svg className="h-3 w-3" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
                    <path d="M164.3 36.1c11.4-6.8 26-4 32.1 8.6L222.8 94c5.7 11.6 3.1 25.7-6.4 34.3l-40.2 36.8c-6.6 6-6.4 16.2 .4 22.5 18.3 17.1 39.8 32.7 64 46.1 23.7 13.2 48.7 23.2 74.5 30.1 10.4 2.8 21.4-.2 28.9-7.8l40.2-36.8c10.4-10.4 27.3-11.7 39.4-3.1l59.1 41.9c12.6 8.9 15.2 26.8 5.6 39.1l-37.3 47.8c-9.9 12.7-25.8 19.6-43 18.2C187.1 349.1 89.7 276.5 55 170.9c-5.4-16.4-1.2-34.5 11.1-47.1L146.1 60.7c5.6-5.6 12.4-9.5 20.2-11.8 7.6-2.3 15.7-2.3 23.2 0z" />
                  </svg>
                  Call Now
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && contacts.length === 0 && !error && (
          <div className="py-20 text-center">
            <svg className="mb-4 mx-auto h-9 w-9 text-dim" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
              <path d="M96 0C43 0 0 43 0 96V416c0 53 43 96 96 96H384h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V384c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H384 96zm0 384H352v64H96c-17.7 0-32-14.3-32-32s14.3-32 32-32zm32-240c0-8.8 7.2-16 16-16H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16zm16 48H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16s7.2-16 16-16z" />
            </svg>
            <p className="text-muted">No emergency contacts available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
