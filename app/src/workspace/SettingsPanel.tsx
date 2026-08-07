import type { JSONSchema } from '../core/types';
import { useAppStore } from '../store/app-store';

interface SettingsPanelProps {
  schema: JSONSchema;
}

export function SettingsPanel({ schema }: SettingsPanelProps) {
  const parameters = useAppStore((state) => state.parameters);
  const setParameter = useAppStore((state) => state.setParameter);

  const names = Object.keys(schema.properties ?? {});
  if (names.length === 0) {
    return <p className="muted">Esta ferramenta não possui configurações adicionais.</p>;
  }

  return (
    <div className="cp-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cp-space-3)' }}>
      {names.map((name) => {
        const property = schema.properties![name];
        return (
          <div key={name} className="cp-field">
            <SettingsControl
              name={name}
              toolParam={property}
              value={parameters[name] ?? property.default}
              onValue={(value) => setParameter(name, value)}
            />
          </div>
        );
      })}
    </div>
  );
}

interface SettingsControlProps {
  name: string;
  toolParam: NonNullable<Parameters<typeof SettingsPanel>[0]['schema']['properties']>[string];
  value: unknown;
  onValue: (value: unknown) => void;
}

function SettingsControl({ name, toolParam, value, onValue }: SettingsControlProps) {
  const label = toolParam.title ?? name;

  if (toolParam.type === 'boolean') {
    return (
      <label className="cp-toggle">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onValue(event.target.checked)}
        />
        <span>{label}</span>
      </label>
    );
  }

  if (toolParam.type === 'number' || toolParam.type === 'integer') {
    return (
      <>
        <label htmlFor={`param-${name}`}>{label}</label>
        <input
          id={`param-${name}`}
          type="number"
          value={String(value ?? '')}
          min={toolParam.minimum}
          max={toolParam.maximum}
          onChange={(event) => onValue(event.target.value === '' ? undefined : Number(event.target.value))}
        />
      </>
    );
  }

  if (toolParam.enum) {
    return (
      <>
        <label htmlFor={`param-${name}`}>{label}</label>
        <select
          id={`param-${name}`}
          value={String(value ?? '')}
          onChange={(event) => onValue(event.target.value)}
        >
          {toolParam.enum.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      </>
    );
  }

  return (
    <>
      <label htmlFor={`param-${name}`}>{label}</label>
      <input
        id={`param-${name}`}
        type="text"
        value={String(value ?? '')}
        onChange={(event) => onValue(event.target.value)}
      />
    </>
  );
}