<script lang="ts">
  interface Props {
    type?: "text" | "number" | "email" | "password" | "search" | "tel" | "url";
    value?: string | number;
    placeholder?: string;
    variant?: "default" | "ghost";
    disabled?: boolean;
    readonly?: boolean;
    id?: string;
    name?: string;
    className?: string;
    onValueChange?: (value: string) => void | Promise<void>;
  }

  let {
    type = "text",
    value = "",
    placeholder = "Placeholder",
    variant = "default",
    disabled = false,
    readonly = false,
    id = undefined,
    name = undefined,
    className = "",
    onValueChange,
  }: Props = $props();
</script>

<input
  {type}
  {id}
  {name}
  {placeholder}
  {disabled}
  {readonly}
  value={value}
  class={`input-field ${variant === "ghost" ? "input-ghost" : "input-default"} ${className}`}
  oninput={(event) => onValueChange?.((event.currentTarget as HTMLInputElement).value)}
/>
