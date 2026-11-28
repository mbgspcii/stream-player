export type Fact = {
    label: string;
    value: string;
    /** `warning` draws the eye to a value that explains a problem. */
    tone?: 'default' | 'warning';
};

/** A list of names and values, one per line. */
export const Facts = ({ label, facts }: { label: string; facts: Fact[] }) => (
    <div className="flex flex-col gap-1" role="list" aria-label={label}>
        {facts.map((fact) => (
            <div key={fact.label} className="flex flex-wrap gap-x-3" role="listitem">
                <span className="min-w-[220px] text-muted">{fact.label}</span>
                <span className={fact.tone === 'warning' ? 'text-warning' : undefined}>{fact.value}</span>
            </div>
        ))}
    </div>
);
