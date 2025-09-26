import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Países principales con códigos telefónicos y banderas
// Nota: para NANP (código 1) asumimos EE.UU. por defecto si no hay más contexto
const COUNTRIES = [
  { code: "CO", name: "Colombia", dialCode: "57", flag: "🇨🇴" },
  { code: "MX", name: "México", dialCode: "52", flag: "🇲🇽" },
  { code: "ES", name: "España", dialCode: "34", flag: "🇪🇸" },
] as const;

export type Country = typeof COUNTRIES[number];

const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.code === "CO")!;

const onlyDigits = (v: string) => v.replace(/\D/g, "");

function detectCountryFromFullNumber(full: string | undefined): Country {
  const digits = onlyDigits(full ?? "");
  if (!digits) return DEFAULT_COUNTRY;
  // Ordenar por longitud de prefijo descendente para coincidencia más específica
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  const found = sorted.find((c) => digits.startsWith(c.dialCode));
  return found ?? DEFAULT_COUNTRY;
}

function splitLocalFromFull(full: string | undefined, country: Country): string {
  const digits = onlyDigits(full ?? "");
  if (!digits) return "";
  if (digits.startsWith(country.dialCode)) {
    return digits.slice(country.dialCode.length);
  }
  return digits; // fallback
}

export function formatPhoneWithFlag(full: string | undefined): { flag: string; display: string } {
  const country = detectCountryFromFullNumber(full);
  const local = splitLocalFromFull(full, country);
  const display = `+${country.dialCode} ${local}`.trim();
  return { flag: country.flag, display };
}

export function PhoneDisplay({ value }: { value?: string }) {
  const { flag, display } = useMemo(() => formatPhoneWithFlag(value), [value]);
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden>{flag}</span>
      <span className="tabular-nums">{display}</span>
    </span>
  );
}

export function PhoneInput({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [local, setLocal] = useState<string>("");

  // Sync desde value externo
  useEffect(() => {
    if (value == null) {
      setCountry(DEFAULT_COUNTRY);
      setLocal("");
      return;
    }
    const c = detectCountryFromFullNumber(value);
    setCountry(c);
    setLocal(splitLocalFromFull(value, c));
  }, [value]);

  // Emisión se realiza solo en handlers para evitar bucles de sincroncronización

  return (
    <div className="flex gap-2">
      <Select
        value={country.code}
        onValueChange={(code) => {
          const next = COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
          setCountry(next);
          const digits = onlyDigits(local);
          const full = digits ? `${next.dialCode}${digits}` : "";
          onChange(full);
        }}
      >
        <SelectTrigger className="w-[160px] z-50">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span aria-hidden>{country.flag}</span>
              <span className="truncate">+{country.dialCode}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72 z-[60]">
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code} className="cursor-pointer">
              <div className="flex items-center gap-2">
                <span aria-hidden>{c.flag}</span>
                <span className="truncate">{c.name} (+{c.dialCode})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        inputMode="numeric"
        pattern="[0-9]*"
        value={local}
        onChange={(e) => {
          const digits = onlyDigits(e.target.value);
          setLocal(digits);
          const full = digits ? `${country.dialCode}${digits}` : "";
          onChange(full);
        }}
        placeholder="Número sin prefijo"
        className="flex-1"
        aria-label="Número de teléfono"
      />
    </div>
  );
}
