import { useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { fieldLabel: string };

export default function PasswordInput({ fieldLabel, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return <span className="password-field"><input {...props} type={visible ? "text" : "password"} /><button type="button" className="password-toggle" aria-label={`${visible ? "Hide" : "Show"} ${fieldLabel}`} aria-pressed={visible} onClick={() => setVisible(value => !value)}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>{visible && <path d="M4 20 20 4"/>}</svg></button></span>;
}
