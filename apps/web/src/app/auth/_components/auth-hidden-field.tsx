interface AuthHiddenFieldProps {
  name: string;
  value: string;
}

export function AuthHiddenField({ name, value }: AuthHiddenFieldProps) {
  return <input type="hidden" name={name} value={value} readOnly />;
}