import { describe, expect, it } from "vitest";
import { canTransitionAppointmentStatus } from "./appointment-status";

describe("canTransitionAppointmentStatus", () => {
  it("allows the normal forward flow", () => {
    expect(canTransitionAppointmentStatus("scheduled", "confirmed")).toBe(true);
    expect(canTransitionAppointmentStatus("confirmed", "completed")).toBe(true);
  });

  it("allows cancelling or marking a no-show from scheduled or confirmed", () => {
    expect(canTransitionAppointmentStatus("scheduled", "cancelled")).toBe(true);
    expect(canTransitionAppointmentStatus("confirmed", "cancelled")).toBe(true);
    expect(canTransitionAppointmentStatus("scheduled", "no_show")).toBe(true);
    expect(canTransitionAppointmentStatus("confirmed", "no_show")).toBe(true);
  });

  it("allows completing straight from scheduled (skipping confirmation)", () => {
    expect(canTransitionAppointmentStatus("scheduled", "completed")).toBe(true);
  });

  it("treats completed/cancelled/no_show as terminal", () => {
    expect(canTransitionAppointmentStatus("completed", "scheduled")).toBe(false);
    expect(canTransitionAppointmentStatus("cancelled", "confirmed")).toBe(false);
    expect(canTransitionAppointmentStatus("no_show", "completed")).toBe(false);
  });

  it("rejects moving backward from confirmed to scheduled", () => {
    expect(canTransitionAppointmentStatus("confirmed", "scheduled")).toBe(false);
  });

  it("allows a no-op transition to the same status", () => {
    expect(canTransitionAppointmentStatus("confirmed", "confirmed")).toBe(true);
  });
});
