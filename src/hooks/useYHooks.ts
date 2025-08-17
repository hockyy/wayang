import { useState, useEffect } from "react";
import { TypedYMap } from "./yTyped";
import * as Y from "yjs";

// A couple of helper hooks for using Y.js for state management

export function useYField<M extends Record<string, unknown>, K extends keyof M>(
  map: TypedYMap<M>,
  key: K
): [M[K], (newValue: M[K]) => void] {
  const [state, setState] = useState(map.get(key));
  const setValue = (value: M[K]) => {
    map.set(key, value);
  };
  useEffect(() => {
    const changeHandler = (event: Y.YMapEvent<unknown>) => {
      if (event.changes.keys.has(key as string)) {
        setState(map.get(key));
        console.log(key, "changed to", map.get(key));
      }
    };
    map.observe(changeHandler);
    return () => {
      map.unobserve(changeHandler);
    };
  }, [map, key]);
  return [state, setValue];
}

export function useYArray<T>(yArray: Y.Array<T>): T[] {
  const [state, setState] = useState(yArray.toArray());
  useEffect(() => {
    const changeHandler = () => {
      console.log("Array changed", yArray.toJSON());
      setState(yArray.toArray());
    };
    yArray.observe(changeHandler);
    return () => {
      yArray.unobserve(changeHandler);
    };
  }, [yArray]);
  return state;
}

// Hook to observe deep changes in nested Y.Maps and Y.Arrays
export function useYDeepArray<T>(yArray: Y.Array<T>): T[] {
  const [state, setState] = useState(yArray.toArray());
  
  useEffect(() => {
    const updateState = () => {
      setState(yArray.toArray());
    };

    const changeHandler = () => {
      console.log("Deep array changed", yArray.toJSON());
      updateState();
    };

    // Observe the main array
    yArray.observe(changeHandler);

    // Observe changes to nested Y.Maps within the array
    const observeNested = () => {
      yArray.forEach((item, index) => {
        if (item instanceof Y.Map) {
          const nestedHandler = () => {
            console.log(`Nested map at index ${index} changed`);
            updateState();
          };
          item.observe(nestedHandler);
          
          // Also observe nested arrays within the maps
          item.forEach((value, key) => {
            if (value instanceof Y.Array) {
              const nestedArrayHandler = () => {
                console.log(`Nested array ${key} at index ${index} changed`);
                updateState();
              };
              value.observe(nestedArrayHandler);
            }
          });
        }
      });
    };

    // Initial observation of nested structures
    observeNested();

    // Re-observe when the main array changes (new items added/removed)
    const deepChangeHandler = () => {
      updateState();
      // Re-observe nested structures after changes
      setTimeout(observeNested, 0);
    };

    yArray.observe(deepChangeHandler);

    return () => {
      yArray.unobserve(changeHandler);
      yArray.unobserve(deepChangeHandler);
      // Note: In a production app, you'd want to keep track of nested observers
      // and properly unobserve them to prevent memory leaks
    };
  }, [yArray]);

  return state;
}
