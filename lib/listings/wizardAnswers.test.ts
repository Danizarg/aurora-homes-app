import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_ROOMS, asksRentKind, parseCount, positioningForPriceMode, priceModeOf } from "./wizardAnswers.ts";

test("count_accepts_plain_numbers", () => {
  assert.equal(parseCount("7"), 7);
  assert.equal(parseCount(" 12 "), 12);
  assert.equal(parseCount("0"), 0);
});

test("count_upper_limit_matches_server", () => {
  assert.equal(MAX_ROOMS, 50);
  assert.equal(parseCount("50"), 50);
  assert.equal(parseCount("51"), null);
});

test("count_rejects_non_whole_numbers", () => {
  assert.equal(parseCount(""), null);
  assert.equal(parseCount("2.5"), null);
  assert.equal(parseCount("-1"), null);
  assert.equal(parseCount("abc"), null);
});

test("price_mode_from_positioning", () => {
  assert.equal(priceModeOf("sale"), "sale");
  assert.equal(priceModeOf("rent_holiday"), "rent");
  assert.equal(priceModeOf(undefined), "rent");
});

test("switching_to_sale_sets_sale", () => assert.equal(positioningForPriceMode("sale", "rent_holiday"), "sale"));
test("switching_to_rent_keeps_holiday", () => assert.equal(positioningForPriceMode("rent", "rent_holiday"), "rent_holiday"));
test("switching_to_rent_from_sale_is_long_term", () => assert.equal(positioningForPriceMode("rent", "sale"), "rent_long"));

test("rent_kind_asked_only_for_rentals_without_preset", () => {
  assert.equal(asksRentKind("rent", undefined), true);
  assert.equal(asksRentKind("sale", undefined), false);
  assert.equal(asksRentKind("rent", "rent_holiday"), false);
});
