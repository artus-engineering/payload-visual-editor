import { RefObject, useEffect } from "react";
import { previewOrigin } from "../../../utils/previewMessaging";

type Message = "ready";

export const useOnPreviewMessage = (
  previewUrl: string,
  windowRef: RefObject<HTMLIFrameElement | Window>,
  callback: (message: Message) => unknown,
) => {
  useEffect(() => {
    const origin = previewOrigin(previewUrl, window.location.href);
    const listener = (event: MessageEvent) => {
      const current = windowRef.current;
      const expectedWindow =
        current instanceof HTMLIFrameElement ? current.contentWindow : current;
      if (
        event.origin !== origin ||
        event.source !== expectedWindow ||
        event.data !== "ready"
      )
        return;
      callback(event.data);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [previewUrl, windowRef, callback]);
};
