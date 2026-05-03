import type { ReactNode } from "react";
import { InfoIcon } from "../Icons";
import { INSPECTOR_INFO, type InspectorInfoKey } from "./inspectorInfo";

interface InspectorLabelProps {
  infoKey: InspectorInfoKey;
  valueText?: string;
  actions?: ReactNode;
  onOpenInfo: (key: InspectorInfoKey) => void;
}

export function InspectorLabel({
  infoKey,
  valueText,
  actions,
  onOpenInfo,
}: InspectorLabelProps) {
  const info = INSPECTOR_INFO[infoKey];

  return (
    <div className="inspector-label-row">
      <div className="inspector-label-left">
        <p className="inspector-label">{info.label}</p>
        <button
          className="inspector-info-button"
          type="button"
          aria-label={`About ${info.label}`}
          title={`About ${info.label}`}
          onClick={() => onOpenInfo(infoKey)}
        >
          <InfoIcon className="inspector-info-icon" />
        </button>
      </div>
      {(valueText || actions) && (
        <div className="inspector-label-actions">
          {valueText && <span className="inspector-label-value">{valueText}</span>}
          {actions}
        </div>
      )}
    </div>
  );
}
