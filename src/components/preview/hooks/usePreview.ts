import {
  useConfig,
  useDocumentInfo,
  useLocale,
} from "payload/components/utilities";
import { ContextType } from "payload/dist/admin/components/utilities/DocumentInfo/types";
import { Fields } from "payload/types";
import { RefObject } from "react";
import { match } from "ts-pattern";
import { PreviewUrlFn } from "../../../types/previewUrl";
import {
  GenDocConfig,
  generateDocument,
} from "../../../utils/generateDocument";
import { sendPreviewDocument } from "../../../utils/previewMessaging";
import { useFields } from "./useFields";
import { useOnFieldChanges } from "./useOnFieldChanges";
import { useOnPreviewMessage } from "./useOnPreviewMessage";

const getFieldConfigs = (documentInfo: ContextType) => {
  return documentInfo.collection?.fields ?? documentInfo.global?.fields ?? [];
};

const updatePreview = async (
  genDocConfig: GenDocConfig,
  fields: Fields,
  windowRef: RefObject<HTMLIFrameElement | Window>,
  previewUrl: string,
) => {
  try {
    const doc = await generateDocument(genDocConfig, fields);

    if (windowRef.current instanceof HTMLIFrameElement) {
      sendPreviewDocument(
        windowRef.current.contentWindow,
        doc,
        previewUrl,
        window.location.href,
      );
    } else {
      sendPreviewDocument(
        windowRef.current,
        doc,
        previewUrl,
        window.location.href,
      );
    }
  } catch (e) {
    console.error(e);
  }
};

export const usePreview = (
  previewUrlFn: PreviewUrlFn,
  windowRef: RefObject<HTMLIFrameElement | Window>,
) => {
  const payloadConfig = useConfig();
  const documentInfo = useDocumentInfo();
  const fieldConfigs = getFieldConfigs(documentInfo);
  const fields = useFields();

  const genDocConfig: GenDocConfig = {
    collections: payloadConfig.collections,
    globals: payloadConfig.globals,
    fieldConfigs,
    serverUrl: payloadConfig.serverURL,
    apiPath: payloadConfig.routes.api,
    documentId: documentInfo.id,
  };

  const locale = useLocale();

  const previewUrl = payloadConfig.localization
    ? previewUrlFn({ locale: locale.code })
    : previewUrlFn({ locale: "" });

  useOnPreviewMessage(previewUrl, windowRef, (message) => {
    match(message)
      .with("ready", () =>
        updatePreview(genDocConfig, fields.current, windowRef, previewUrl),
      )
      .exhaustive();
  });

  useOnFieldChanges(fields.current, () => {
    updatePreview(genDocConfig, fields.current, windowRef, previewUrl);
  });

  return previewUrl;
};
