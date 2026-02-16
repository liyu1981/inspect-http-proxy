import React from "react";

export function useDebounced<T>(value: T, delay: number = 500) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return [debouncedValue, setDebouncedValue] as const;
}
