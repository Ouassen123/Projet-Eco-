import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { genererNumeroSequenceOM } from "@/lib/numerotation";

const prisma = new PrismaClient();

describe("Test de concurrence — Numérotation OM", () => {
  beforeAll(async () => {
    await prisma.sequence.deleteMany({ where: { scope: { startsWith: "TEST_CONCURRENCY" } } });
  }, 15000);

  afterAll(async () => {
    await prisma.sequence.deleteMany({ where: { scope: { startsWith: "TEST_CONCURRENCY" } } });
    await prisma.$disconnect();
  }, 15000);

  it("génère des numéros uniques séquentiels sans collision", async () => {
    const scope = "TEST_CONCURRENCY_1";
    const N = 10;

    // SQLite sérialise les écritures — tester en séquentiel
    const resultats: number[] = [];
    for (let i = 0; i < N; i++) {
      const num = await prisma.$transaction(async (tx) => {
        return genererNumeroSequenceOM(tx, scope);
      });
      resultats.push(num);
    }

    const uniques = new Set(resultats);
    expect(uniques.size).toBe(N);

    const tries = resultats.sort((a, b) => a - b);
    for (let i = 0; i < N; i++) {
      expect(tries[i]).toBe(i + 1);
    }
  }, 15000);

  it("génère des numéros uniques même avec 50 créations", async () => {
    const scope = "TEST_CONCURRENCY_2";
    const N = 50;

    const resultats: number[] = [];
    for (let i = 0; i < N; i++) {
      const num = await prisma.$transaction(async (tx) => {
        return genererNumeroSequenceOM(tx, scope);
      });
      resultats.push(num);
    }

    const uniques = new Set(resultats);
    expect(uniques.size).toBe(N);
  }, 30000);

  it("la génération de document n'incrémente pas le compteur", async () => {
    const scope = "TEST_CONCURRENCY_3";

    const num1 = await prisma.$transaction(async (tx) => {
      return genererNumeroSequenceOM(tx, scope);
    });

    const seq = await prisma.sequence.findUnique({ where: { scope } });
    expect(seq?.valeur).toBe(num1);

    const num2 = await prisma.$transaction(async (tx) => {
      return genererNumeroSequenceOM(tx, scope);
    });

    expect(num2).toBe(num1 + 1);
  }, 15000);
});
