import type { ReactNode } from 'react';
import { HelpTip } from './help-tooltip';

export type PrepareStepDef = { num: number; label: string; current: boolean; status?: ReactNode; help?: ReactNode; onClick: () => void };

// The four steps an operator takes before the room fills up, read as one sequence rather than
// four unrelated buttons: equal width, evenly spaced, "Step N" above a large action.
export function PrepareSteps({ steps }: { steps: PrepareStepDef[] }) {
    return <section className="prepare-steps" aria-label="Prepare">{steps.map(s => <div key={s.num} className={'prepare-step' + (s.current ? ' is-current' : '')}>
        <div className="prepare-step-eyebrow"><span>Step {s.num}</span>{s.current && <span className="nav-current-tag">Current</span>}{s.help && <HelpTip label={s.label} iconOnly>{s.help}</HelpTip>}</div>
        <button type="button" className="prepare-step-action" aria-current={s.current ? 'step' : undefined} onClick={s.onClick}>
            <span className="prepare-step-label">{s.label}</span>
            {s.status}
        </button>
    </div>)}</section>;
}
