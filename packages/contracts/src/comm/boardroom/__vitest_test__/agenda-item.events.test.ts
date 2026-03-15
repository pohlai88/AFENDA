import { describe, expect, it } from "vitest";
import {
  BoardAgendaItemEventTypes,
  CommAgendaItemEventTypes,
  CommAgendaItemEvents,
} from "../agenda-item.events.js";

describe("agenda-item.events", () => {
  it("keeps the registry and aggregate list aligned", () => {
    expect(BoardAgendaItemEventTypes).toEqual(
      expect.arrayContaining([
        CommAgendaItemEvents.Added,
        CommAgendaItemEvents.Updated,
        CommAgendaItemEvents.Removed,
      ]),
    );
  });

  it("keeps event names unique", () => {
    expect(new Set(BoardAgendaItemEventTypes).size).toBe(BoardAgendaItemEventTypes.length);
  });

  it("keeps canonical and legacy event type aliases aligned", () => {
    expect(CommAgendaItemEventTypes).toEqual(BoardAgendaItemEventTypes);
  });
});
