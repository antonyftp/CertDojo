import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StudyPlanner } from "@/components/study-planner";
import {
  initialStudySessionState,
  useStudySessionStore,
} from "@/lib/study-session-store";

afterEach(async () => {
  await act(async () => {
    useStudySessionStore.setState(initialStudySessionState);
  });
});

describe("StudyPlanner", () => {
  it("validates input and updates the planned topic", async () => {
    render(<StudyPlanner />);

    const input = screen.getByLabelText("Certification topic");

    await act(async () => {
      fireEvent.change(input, { target: { value: "A" } });
      fireEvent.click(screen.getByRole("button", { name: "Save topic" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter at least 2 characters.",
    );

    await act(async () => {
      fireEvent.change(input, { target: { value: "AWS Solutions Architect" } });
      fireEvent.click(screen.getByRole("button", { name: "Save topic" }));
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("AWS Solutions Architect")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
