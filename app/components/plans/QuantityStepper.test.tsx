import { describe, it, expect, vi } from "vitest";
import { create, act } from "react-test-renderer";
import { QuantityStepper } from "./QuantityStepper";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("QuantityStepper Component", () => {
  it("transitions smoothly 0.5 <-> 1 <-> 2 when min is 0.5 and step is 1", () => {
    let value = 0.5;
    const onChange = vi.fn((next: number) => {
      value = next;
    });

    const renderer = create(
      <QuantityStepper
        value={value}
        onChange={onChange}
        min={0.5}
        step={1}
      />
    );

    const root = renderer.root;
    const plusBtn = root.findByProps({ "aria-label": "+" });
    const minusBtn = root.findByProps({ "aria-label": "-" });

    // 1. Initial state 0.5: minus is disabled
    expect(minusBtn.props.disabled).toBe(true);

    // 2. Click plus from 0.5 -> should be 1
    act(() => {
      plusBtn.props.onClick();
    });
    expect(onChange).toHaveBeenLastCalledWith(1);

    // 3. Re-render with value 1
    renderer.update(
      <QuantityStepper
        value={1}
        onChange={onChange}
        min={0.5}
        step={1}
      />
    );
    expect(root.findByProps({ "aria-label": "-" }).props.disabled).toBe(false);

    // 4. Click plus from 1 -> should be 2
    act(() => {
      root.findByProps({ "aria-label": "+" }).props.onClick();
    });
    expect(onChange).toHaveBeenLastCalledWith(2);

    // 5. Re-render with value 2
    renderer.update(
      <QuantityStepper
        value={2}
        onChange={onChange}
        min={0.5}
        step={1}
      />
    );

    // 6. Click minus from 2 -> should be 1
    act(() => {
      root.findByProps({ "aria-label": "-" }).props.onClick();
    });
    expect(onChange).toHaveBeenLastCalledWith(1);

    // 7. Re-render with value 1
    renderer.update(
      <QuantityStepper
        value={1}
        onChange={onChange}
        min={0.5}
        step={1}
      />
    );

    // 8. Click minus from 1 -> should be 0.5
    act(() => {
      root.findByProps({ "aria-label": "-" }).props.onClick();
    });
    expect(onChange).toHaveBeenLastCalledWith(0.5);
  });

  it("commits typed '0.5' and '1' values correctly", () => {
    const onChange = vi.fn();
    const renderer = create(
      <QuantityStepper
        value={1}
        onChange={onChange}
        min={0.5}
        step={1}
      />
    );

    const input = renderer.root.findByType("input");

    // Type 0.5 on blur
    act(() => {
      input.props.onBlur({ target: { value: "0.5" } });
    });
    expect(onChange).toHaveBeenLastCalledWith(0.5);

    // Type 3 on blur
    act(() => {
      input.props.onBlur({ target: { value: "3" } });
    });
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it("handles standard whole-number stepping when min is 1", () => {
    let value = 1;
    const onChange = vi.fn((next: number) => {
      value = next;
    });

    const renderer = create(
      <QuantityStepper
        value={value}
        onChange={onChange}
        min={1}
        step={1}
      />
    );

    const plusBtn = renderer.root.findByProps({ "aria-label": "+" });
    const minusBtn = renderer.root.findByProps({ "aria-label": "-" });

    expect(minusBtn.props.disabled).toBe(true);

    act(() => {
      plusBtn.props.onClick();
    });
    expect(onChange).toHaveBeenLastCalledWith(2);
  });
});
