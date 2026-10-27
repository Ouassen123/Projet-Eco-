import { describe, it, expect } from "vitest";
import { convertMontantEnLettres } from "@/lib/montantLettres";

describe("convertMontantEnLettres", () => {
  it("convertit un montant entier simple", () => {
    expect(convertMontantEnLettres(1)).toBe("Un dirham");
    expect(convertMontantEnLettres(0)).toBe("Zero dirhams");
  });

  it("gere les exceptions 70-79 / 80-89 / 90-99", () => {
    expect(convertMontantEnLettres(71)).toBe("Soixante et onze dirhams");
    expect(convertMontantEnLettres(80)).toBe("Quatre-vingts dirhams");
    expect(convertMontantEnLettres(81)).toBe("Quatre-vingt-un dirhams");
    expect(convertMontantEnLettres(91)).toBe("Quatre-vingt-onze dirhams");
    expect(convertMontantEnLettres(99)).toBe("Quatre-vingt-dix-neuf dirhams");
  });

  it("gere les centaines", () => {
    expect(convertMontantEnLettres(100)).toBe("Cent dirhams");
    expect(convertMontantEnLettres(200)).toBe("Deux cents dirhams");
    expect(convertMontantEnLettres(201)).toBe("Deux cent un dirhams");
  });

  it("gere les milliers", () => {
    expect(convertMontantEnLettres(1000)).toBe("Mille dirhams");
    expect(convertMontantEnLettres(2000)).toBe("Deux mille dirhams");
    expect(convertMontantEnLettres(4870)).toBe(
      "Quatre mille huit cent soixante-dix dirhams"
    );
  });

  it("gere les centimes", () => {
    expect(convertMontantEnLettres(4870.8)).toBe(
      "Quatre mille huit cent soixante-dix dirhams et quatre-vingts centimes"
    );
    expect(convertMontantEnLettres(1.01)).toBe("Un dirham et un centime");
  });
});
