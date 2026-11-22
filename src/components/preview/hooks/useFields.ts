import { useAllFormFields } from "payload/components/forms";
import { useEffect, useRef } from "react";

export const useFields = () => {
  const [fields] = useAllFormFields();
  const ref = useRef(fields);

  useEffect(() => {
    ref.current = fields;
  }, [fields]);

  return ref;
};

// Keep the latest form snapshot available to preview callbacks on the supported React 18 runtime.
