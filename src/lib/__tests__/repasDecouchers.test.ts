import { describe, it, expect } from "vitest";
import {
  calculerOccurrences,
  compterJoursMission,
} from "@/lib/repasDecouchers";

// Toutes les dates sont construites en UTC pour representer une heure
// locale "naive" (voir convention documentee dans joursFeries.ts).
function d(iso: string): Date {
  return new Date(iso + "Z");
}

describe("calculerOccurrences - repas midi (11:00-14:00)", () => {
  it("mission couvrant toute la fenetre -> eligible", () => {
    const occ = calculerOccurrences(
      d("2026-09-01T10:00:00"),
      d("2026-09-01T15:00:00")
    );
    expect(occ.some((o) => o.type === "REPAS_MIDI")).toBe(true);
  });

  it("mission ne couvrant pas le debut de la fenetre -> non eligible", () => {
    // Depart 12:00 (apres 11:00) -> fenetre non couverte entierement.
    const occ = calculerOccurrences(
      d("2026-09-01T12:00:00"),
      d("2026-09-01T14:00:00")
    );
    expect(occ.some((o) => o.type === "REPAS_MIDI")).toBe(false);
  });

  it("mission se terminant avant la fin de la fenetre -> non eligible", () => {
    const occ = calculerOccurrences(
      d("2026-09-01T12:00:00"),
      d("2026-09-01T13:30:00")
    );
    expect(occ.some((o) => o.type === "REPAS_MIDI")).toBe(false);
  });

  it("bornes exactes 11:00 -> 14:00 -> eligible", () => {
    const occ = calculerOccurrences(
      d("2026-09-01T11:00:00"),
      d("2026-09-01T14:00:00")
    );
    expect(occ.some((o) => o.type === "REPAS_MIDI")).toBe(true);
  });
});

describe("calculerOccurrences - decoucher (00:00-05:00)", () => {
  it("mission multi-jours couvre le decoucher de chaque nuit intermediaire", () => {
    const occ = calculerOccurrences(
      d("2026-09-01T08:00:00"),
      d("2026-09-03T18:00:00")
    );
    const decouchers = occ.filter((o) => o.type === "DECOUCHER");
    // Nuits du 2 (00h-05h) et du 3 (00h-05h) sont entierement couvertes.
    // Le 1er (00h-05h) n'est pas couvert car depart a 08h.
    expect(decouchers.length).toBe(2);
  });
});

describe("compterJoursMission", () => {
  it("mission sur un seul jour = 1 jour", () => {
    expect(
      compterJoursMission(d("2026-09-01T08:00:00"), d("2026-09-01T18:00:00"))
    ).toBe(1);
  });

  it("mission sur 3 jours calendaires = 3 jours", () => {
    expect(
      compterJoursMission(d("2026-09-01T08:00:00"), d("2026-09-03T18:00:00"))
    ).toBe(3);
  });
});
