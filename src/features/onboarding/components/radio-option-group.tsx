import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface RadioOptionGroupProps {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
}

export function RadioOptionGroup({ name, value, onValueChange, options }: RadioOptionGroupProps) {
  return (
    <RadioGroup value={value} onValueChange={onValueChange}>
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        return (
          <Label
            key={option.value}
            htmlFor={id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-input px-3 py-2.5 font-normal has-data-checked:border-primary has-data-checked:bg-primary/5"
          >
            <RadioGroupItem id={id} value={option.value} />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium text-foreground">{option.label}</span>
              {option.description && (
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              )}
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
