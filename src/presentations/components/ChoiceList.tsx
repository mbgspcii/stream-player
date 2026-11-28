import { Button } from './Button';

export type Choice = {
    /** What `onSelect` gets. -1 is the choice that turns the others off ("Auto", "Off"). */
    index: number;
    label: string;
    /** A second, quieter text: a bitrate, a language. */
    detail?: string;
};

type ChoiceListProps = {
    label: string;
    choices: Choice[];
    /** The choice of the user. */
    selected: number;
    /** The choice that the player is showing now. It gets a green mark. */
    playing?: number;
    disabled?: boolean;
    onSelect: (index: number) => void;
};

/** A row of buttons where one is chosen. */
export const ChoiceList = ({ label, choices, selected, playing, disabled, onSelect }: ChoiceListProps) => (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {choices.map((choice) => {
            const isPlaying = choice.index === playing;
            return (
                <span key={choice.index} className="relative inline-flex">
                    <Button
                        size="small"
                        emphasis={choice.index === selected ? 'strong' : 'default'}
                        disabled={disabled}
                        aria-label={`${choice.label}${choice.detail ? `, ${choice.detail}` : ''}${isPlaying ? ', playing' : ''}`}
                        onClick={() => onSelect(choice.index)}
                    >
                        {choice.label}
                        {choice.detail ? (
                            <small className="ml-1 text-[length:inherit] tabular-nums opacity-70">
                                {choice.detail}
                            </small>
                        ) : null}
                    </Button>
                    {isPlaying ? (
                        // The rendition on screen: a green dot on the corner of its button.
                        <span
                            aria-hidden
                            className="absolute -top-[3px] -right-[3px] size-[10px] rounded-full border-2 border-panel bg-ok"
                        />
                    ) : null}
                </span>
            );
        })}
    </div>
);
