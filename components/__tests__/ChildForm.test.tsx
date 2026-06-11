import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChildForm } from "../ChildForm";

const mockOnSubmit = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ChildForm", () => {
  it("renders all fields and submit button", () => {
    render(<ChildForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Grade")).toBeInTheDocument();
    expect(screen.getByLabelText("Gender")).toBeInTheDocument();
    expect(screen.getByLabelText("Score")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("shows custom submit label", () => {
    render(<ChildForm onSubmit={mockOnSubmit} submitLabel="Add Student" />);

    expect(screen.getByRole("button", { name: "Add Student" })).toBeInTheDocument();
  });

  it("calls onSubmit with parsed data on valid submission", async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);
    render(<ChildForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.selectOptions(screen.getByLabelText("Grade"), "5 primary");
    await user.selectOptions(screen.getByLabelText("Gender"), "female");
    await user.type(screen.getByLabelText("Score"), "95");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "Alice",
        grade: "5 primary",
        gender: "female",
        score: 95,
      });
    });
  });

  it("shows loading state while submitting", async () => {
    const user = userEvent.setup();
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockOnSubmit.mockReturnValue(promise);
    render(<ChildForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.selectOptions(screen.getByLabelText("Grade"), "5 primary");
    await user.selectOptions(screen.getByLabelText("Gender"), "female");
    await user.type(screen.getByLabelText("Score"), "95");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByRole("button", { name: "Saving..." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();

    resolvePromise!();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Saving..." })).not.toBeInTheDocument();
    });
  });

  it("does not call onSubmit with empty name", async () => {
    const user = userEvent.setup();
    render(<ChildForm onSubmit={mockOnSubmit} />);

    await user.selectOptions(screen.getByLabelText("Grade"), "5 primary");
    await user.selectOptions(screen.getByLabelText("Gender"), "female");
    await user.type(screen.getByLabelText("Score"), "95");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("does not call onSubmit with empty grade", async () => {
    const user = userEvent.setup();
    render(<ChildForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.selectOptions(screen.getByLabelText("Gender"), "female");
    await user.type(screen.getByLabelText("Score"), "95");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("does not call onSubmit with negative score", async () => {
    const user = userEvent.setup();
    render(<ChildForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText("Name"), "Alice");
    await user.selectOptions(screen.getByLabelText("Grade"), "5 primary");
    await user.selectOptions(screen.getByLabelText("Gender"), "female");
    await user.type(screen.getByLabelText("Score"), "-5");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("populates fields with defaultValues", () => {
    render(
      <ChildForm
        onSubmit={mockOnSubmit}
        defaultValues={{ name: "Bob", grade: "3 primary", gender: "male", score: 80 }}
      />,
    );

    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    expect(nameInput.value).toBe("Bob");
    const scoreInput = screen.getByLabelText("Score") as HTMLInputElement;
    expect(scoreInput.value).toBe("80");
    const gradeSelect = screen.getByLabelText("Grade") as HTMLSelectElement;
    expect(gradeSelect.value).toBe("3 primary");
    const genderSelect = screen.getByLabelText("Gender") as HTMLSelectElement;
    expect(genderSelect.value).toBe("male");
  });
});
