import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SuggestedQuestionsEditor } from "./SuggestedQuestionsEditor";

describe("SuggestedQuestionsEditor", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it("renders the initial list as chips", () => {
    render(
      <SuggestedQuestionsEditor
        value={["Top skills?", "Remote?"]}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("Top skills?")).toBeInTheDocument();
    expect(screen.getByText("Remote?")).toBeInTheDocument();
  });

  it("adds a new question via the Add button", () => {
    render(<SuggestedQuestionsEditor value={["A"]} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText(/add a question/i), {
      target: { value: "B" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(onChange).toHaveBeenCalledWith(["A", "B"]);
  });

  it("adds a new question via Enter key", () => {
    render(<SuggestedQuestionsEditor value={[]} onChange={onChange} />);
    const input = screen.getByPlaceholderText(/add a question/i);
    fireEvent.change(input, { target: { value: "Hello?" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["Hello?"]);
  });

  it("removes a question when the × button is clicked", () => {
    render(
      <SuggestedQuestionsEditor
        value={["A", "B", "C"]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /remove "B"/i }));
    expect(onChange).toHaveBeenCalledWith(["A", "C"]);
  });

  it("caps at 6 questions: Add button + input are disabled and placeholder reflects state", () => {
    const six = ["a", "b", "c", "d", "e", "f"];
    render(<SuggestedQuestionsEditor value={six} onChange={onChange} />);
    expect(
      screen.getByPlaceholderText(/max 6 questions reached/i),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
  });

  it("trims input and rejects empty / whitespace-only adds", () => {
    render(<SuggestedQuestionsEditor value={["A"]} onChange={onChange} />);
    const input = screen.getByPlaceholderText(/add a question/i);
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("dedupes: re-adding an existing question clears the input, does not call onChange, and shows 'Already in the list'", () => {
    render(<SuggestedQuestionsEditor value={["A"]} onChange={onChange} />);
    const input = screen.getByPlaceholderText(/add a question/i);
    fireEvent.change(input, { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent(/already in the list/i);
  });

  it("shows the 'X of 6' counter", () => {
    render(
      <SuggestedQuestionsEditor value={["A", "B"]} onChange={onChange} />,
    );
    expect(screen.getByText("2 of 6 questions")).toBeInTheDocument();
  });
});
